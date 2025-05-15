from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
import uuid
import json
import traceback
import os
import shutil
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from langchain_groq import ChatGroq
from langchain_ollama import OllamaEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain_community.vectorstores import FAISS

from utils import get_vector_store_path, get_current_user, get_app_db

# Set up logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# Request models
class QueryRequest(BaseModel):
    query: str
    project_name: str
    chat_id: Optional[str] = None

class Message(BaseModel):
    role: str
    content: str

class Conversation(BaseModel):
    id: str
    user_id: str
    project_name: str
    messages: List[Message]
    created_at: str

# Enhanced text splitting
def get_text_splitter():
    return RecursiveCharacterTextSplitter(
        chunk_size=1500,
        chunk_overlap=300,
        length_function=len,
        separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
    )

# Get embeddings model
def get_embeddings():
    return OllamaEmbeddings(model="llama3.2:1b")

# Get LLM
def get_llm():
    return ChatGroq(temperature=0.2, model_name="llama-3.3-70b-versatile")

# FAISS vector store operations
def create_vector_store(texts, embeddings, metadatas=None):
    return FAISS.from_texts(texts, embeddings, metadatas=metadatas)

def save_vector_store(vector_store, path):
    vector_store.save_local(path)

def load_vector_store(path, embeddings):
    try:
        return FAISS.load_local(
            path,
            embeddings,
            allow_dangerous_deserialization=True
        )
    except Exception as e:
        logger.error(f"Error loading vector store: {e}")
        return None

# Conversation history functions
def get_conversation_history(chat_id, conn, max_messages=10):
    if not chat_id:
        return ""
        
    messages = json.loads(conn.execute(
        "SELECT messages FROM chat_history WHERE id = ?", 
        (chat_id,)
    ).fetchone()['messages'])
    
    if not messages:
        return ""
    
    history = ""
    # Get last 'max_messages' messages
    for msg in messages[-max_messages:]:
        role = msg["role"]
        content = msg["content"]
        history += f"{role.capitalize()}: {content}\n\n"
    
    return history.strip()

# Enhanced RAG chain setup with conversation history
def setup_rag_chain(vector_store, conversation_history=None):
    llm = get_llm()
    
    # Create a better prompt that focuses on answering the specific user question
    prompt = ChatPromptTemplate.from_template("""
    You are a helpful AI assistant that helps developers understand their codebase. Provide direct, accurate, and helpful answers based on the context below.

    Previous conversation:
    {conversation_history}

    Context from documentation:
    {context}

    User input: {input}

    Instructions:
    1. Only answer the specific question or respond to the specific input from the user
    2. If the context doesn't contain information relevant to the user's query, just respond conversationally WITHOUT using the context
    3. For general greetings or small talk, respond naturally without referring to the technical context
    4. Only use the retrieved context when it's clearly relevant to a technical question
    5. Be conversational and direct

    Your response:
    """)
    
    document_chain = create_stuff_documents_chain(llm, prompt)
    retriever = vector_store.as_retriever(
        search_type="mmr",  # Maximum Marginal Relevance for diverse results
        search_kwargs={"k": 5, "fetch_k": 20}  # Fetch more, return most relevant
    )
    rag_chain = create_retrieval_chain(retriever, document_chain)
    return rag_chain

@router.get("/vectorize-status/{project_name}")
async def get_vectorize_status(
    project_name: str,
    current_user: dict = Depends(get_current_user)
):
    with get_app_db() as conn:
        result = conn.execute(
            """
            SELECT is_vectorized, vector_path 
            FROM project_vectors 
            WHERE project_name = ? AND user_id = ?
            """,
            (project_name, current_user['id'])
        ).fetchone()
        
        if not result:
            return {"is_vectorized": False}
            
        return {
            "is_vectorized": bool(result['is_vectorized']),
            "vector_path": result['vector_path']
        }

@router.post("/vectorize")
async def vectorize_project(
    project_name: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Get all documentation for the project
        with get_app_db() as conn:
            docs = conn.execute(
                "SELECT doc FROM documentation WHERE project_name = ? AND user_id = ?",
                (project_name, current_user['id'])
            ).fetchall()
            
            if not docs:
                raise HTTPException(status_code=404, detail="No documentation found")
            
            # Process docs with better text splitter
            text_splitter = get_text_splitter()
            chunks = []
            metadatas = []
            
            for doc in docs:
                doc_content = doc['doc']
                
                # Split document into chunks
                doc_chunks = text_splitter.split_text(doc_content)
                chunks.extend(doc_chunks)
                
                # Create metadata for each chunk
                for i, _ in enumerate(doc_chunks):
                    chunk_metadata = {}
                    chunk_metadata.update({
                        "project_name": project_name,
                        "chunk": i,
                        "total_chunks": len(doc_chunks)
                    })
                    metadatas.append(chunk_metadata)
            
            # Create embeddings and vector store
            embeddings = get_embeddings()
            vector_store = create_vector_store(chunks, embeddings, metadatas)
            
            # Save vector store
            vector_store_path = get_vector_store_path(project_name, current_user['id'])
            save_vector_store(vector_store, vector_store_path)
            
            # Update database
            conn.execute(
                """
                INSERT INTO project_vectors (id, project_name, user_id, is_vectorized, vector_path)
                VALUES (?, ?, ?, 1, ?)
                ON CONFLICT(project_name, user_id) 
                DO UPDATE SET is_vectorized = 1, vector_path = ?
                """,
                (str(uuid.uuid4()), project_name, current_user['id'], vector_store_path, vector_store_path)
            )
            conn.commit()
            
            return {
                "message": "Project vectorized successfully",
                "chunks_processed": len(chunks)
            }
            
    except Exception as e:
        logger.error(f"Error vectorizing project: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message")
async def chat_with_project(
    body: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        project_name = body.project_name
        message = body.query
        chat_id = body.chat_id
        
        if not project_name or not message:
            raise HTTPException(status_code=400, detail="Missing required fields")
            
        # Get vector store path
        with get_app_db() as conn:
            vector_info = conn.execute(
                "SELECT vector_path FROM project_vectors WHERE project_name = ? AND user_id = ? AND is_vectorized = 1",
                (project_name, current_user['id'])
            ).fetchone()
            
            if not vector_info:
                raise HTTPException(status_code=400, detail="Project not vectorized")
                
            vector_store_path = vector_info['vector_path']
            
            # Get conversation history if chat_id exists
            conversation_history = ""
            if chat_id:
                conversation_history = get_conversation_history(chat_id, conn)
            
        # Load vector store with better error handling
        embeddings = get_embeddings()
        vector_store = load_vector_store(vector_store_path, embeddings)
        
        if not vector_store:
            raise HTTPException(status_code=500, detail="Failed to load vector store")
        
        # Create enhanced RAG chain
        rag_chain = setup_rag_chain(vector_store, conversation_history)
        
        # Get response with conversation history context
        response = await rag_chain.ainvoke({
            "input": message,
            "conversation_history": conversation_history
        })
        
        # Create new chat ID if none exists
        if not chat_id:
            chat_id = str(uuid.uuid4())
            
        # Save to chat history with improved message handling
        with get_app_db() as conn:
            # Get existing messages or create new chat
            chat = conn.execute(
                "SELECT messages FROM chat_history WHERE id = ?",
                (chat_id,)
            ).fetchone()
            
            messages = json.loads(chat['messages']) if chat else []
            messages.append({
                "role": "user",
                "content": message,
                "timestamp": str(uuid.uuid1())  # Adding timestamp for better tracking
            })
            messages.append({
                "role": "assistant",
                "content": response['answer'],
                "timestamp": str(uuid.uuid1())
            })
            
            # Save chat history
            if chat:
                conn.execute(
                    "UPDATE chat_history SET messages = ? WHERE id = ?",
                    (json.dumps(messages), chat_id)
                )
            else:
                conn.execute(
                    """
                    INSERT INTO chat_history (id, user_id, project_name, messages)
                    VALUES (?, ?, ?, ?)
                    """,
                    (chat_id, current_user['id'], project_name, json.dumps(messages))
                )
            conn.commit()
            
        # Extract source documents for transparency
        source_docs = []
        if 'source_documents' in response:
            for doc in response['source_documents']:
                if hasattr(doc, 'metadata'):
                    source_docs.append({
                        "metadata": doc.metadata,
                        "content": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content
                    })
            
        return {
            "chat_id": chat_id,
            "message": response['answer'],
            "source_documents": source_docs
        }
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{project_name}")
async def get_chat_history(
    project_name: str,
    current_user: dict = Depends(get_current_user)
):
    with get_app_db() as conn:
        chats = conn.execute(
            "SELECT id, messages, created_at FROM chat_history WHERE project_name = ? AND user_id = ? ORDER BY created_at DESC",
            (project_name, current_user['id'])
        ).fetchall()
        
        return [
            {
                "id": chat['id'],
                "messages": json.loads(chat['messages']),
                "created_at": chat['created_at']
            }
            for chat in chats
        ]

@router.delete("/history/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    with get_app_db() as conn:
        conn.execute(
            "DELETE FROM chat_history WHERE id = ? AND user_id = ?",
            (chat_id, current_user['id'])
        )
        conn.commit()
        
    return {"message": "Chat deleted successfully"}
