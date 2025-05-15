import sqlite3
import torch
import ollama
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from trl import PPOTrainer, PPOConfig, AutoModelForCausalLMWithValueHead
from tqdm import tqdm
import numpy as np

class DocumentationRLHF:
    def __init__(self, db_path='app.db'):
        self.db_path = db_path
        self._init_db()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
       
    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS model_versions (
                    id INTEGER PRIMARY KEY,
                    model_name TEXT NOT NULL,
                    version TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
   
    def _get_training_data(self):
        """Retrieve training data from joined tables"""
        conn = sqlite3.connect(self.db_path)
        query = """
            SELECT d.doc, f.feedback, f.rating
            FROM documentation d
            JOIN feedback f ON d.path = f.path AND d.level = f.level
            WHERE f.rating IS NOT NULL
            ORDER BY f.timestamp DESC
        """
        return conn.execute(query).fetchall()

    class RewardModelTrainer:
        def __init__(self, db_path):
            self.tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
            self.model = AutoModelForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=1)
            self.db_path = db_path
        
        def train(self):
            data = DocumentationRLHF(self.db_path)._get_training_data()
            
            # Use ONLY documentation text as input
            texts = [d for d, _, _ in data]  # Just the documentation content
            
            # Ratings remain the same (normalized 0-1)
            ratings = torch.tensor([r/5 for _, _, r in data], dtype=torch.float32)
            
            optimizer = torch.optim.AdamW(self.model.parameters(), lr=2e-5)
            loss_fn = torch.nn.MSELoss()
            
            for epoch in range(3):
                self.model.train()
                for i in tqdm(range(0, len(texts), 16)):
                    batch = self.tokenizer(
                        texts[i:i+16], 
                        padding=True, 
                        truncation=True, 
                        return_tensors="pt"
                    )
                    outputs = self.model(**batch).logits.squeeze()
                    loss = loss_fn(outputs, ratings[i:i+16])
                    loss.backward()
                    optimizer.step()
                    optimizer.zero_grad()
                   
    class PPOTrainer:
        def __init__(self, db_path):
            self.db_path = db_path
            self.tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")
            self.model = AutoModelForCausalLMWithValueHead.from_pretrained(
                "meta-llama/Meta-Llama-3-8B",
                device_map="auto",
                load_in_4bit=True
            )
            self.reward_model = DocumentationRLHF.RewardModelTrainer(db_path).model.eval()
           
            self.ppo_config = PPOConfig(
                batch_size=2,
                learning_rate=1.41e-5,
                kl_penalty="kl",
                target_kl=6.0
            )
           
        def train(self):
            data = DocumentationRLHF(self.db_path)._get_training_data()
           
            # Prepare prompts and previous docs
            prompts = [f"Improve this documentation based on feedback:\n\nOriginal: {d}\nFeedback: {f}\nImproved:"
                      for _, d, f, _ in data]
           
            # Training loop
            ppo_trainer = PPOTrainer(self.ppo_config, self.model, self.model, self.tokenizer)
           
            for epoch in range(3):
                for batch in tqdm(range(0, len(prompts), 2)):
                    prompt_batch = prompts[batch:batch+2]
                   
                    # Generate responses
                    inputs = self.tokenizer(prompt_batch, return_tensors="pt", padding=True)
                    response_tensors = self.model.generate(**inputs)
                   
                    # Get rewards
                    generated_docs = [self.tokenizer.decode(r, skip_special_tokens=True) for r in response_tensors]
                    reward_inputs = self.tokenizer(
                        [f"Documentation: {d}\nFeedback: {f}" for d, (_, _, f, _) in zip(generated_docs, data[batch:batch+2])],
                        padding=True,
                        return_tensors="pt"
                    )
                    rewards = self.reward_model(**reward_inputs).logits.squeeze()
                   
                    # PPO update
                    ppo_trainer.step([inputs.input_ids], [response_tensors], [rewards])

    def generate_improved_doc(self, prompt: str, previous_doc: str, feedback: str = None) -> str:
        """Generate improved documentation using RLHF-trained model"""
        full_prompt = f"""
        Improve the following documentation based on previous feedback:
       
        Original Prompt: {prompt}
        Previous Documentation: {previous_doc}
        {f"Previous Feedback: {feedback}" if feedback else ""}
       
        Improved Documentation:
        """
       
        response = ollama.generate(
            model='llama3',
            prompt=full_prompt,
            options={'temperature': 0.7, 'top_p': 0.9}
        )
       
        return response['response'].split("Improved Documentation:")[-1].strip()

    def log_documentation(self, user_id: str, path: str, doc: str, prompt: str,
                         project_name: str, level: str, root_path: str):
        """Log generated documentation in the database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO documentation
                (user_id, path, doc, prompt, project_name, level, root_path)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, path, doc, prompt, project_name, level, root_path))

    def add_feedback(self, user_id: str, path: str, level: str, feedback: str, rating: int):
        """Add user feedback to the database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO feedback
                (user_id, path, level, feedback, rating)
                VALUES (?, ?, ?, ?, ?)
            """, (user_id, path, level, feedback, rating))

    def full_training_pipeline(self):
        """Complete training workflow"""
        # 1. Train reward model
        reward_trainer = self.RewardModelTrainer(self.db_path)
        reward_trainer.train()
       
        # 2. Train with PPO
        ppo_trainer = self.PPOTrainer(self.db_path)
        ppo_trainer.train()
       
        # 3. Log new model version
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO model_versions (model_name, version)
                VALUES ('documentation_generator', 'rlhf-v1')
            """)

# Example usage
if __name__ == "__main__":
    rlhf = DocumentationRLHF()
   
   
    # Run training
    rlhf.full_training_pipeline()