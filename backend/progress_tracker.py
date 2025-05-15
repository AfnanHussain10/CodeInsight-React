from typing import Dict, Optional
from datetime import datetime

class ProgressTracker:
    def __init__(self, progress_key: str):
        self.progress_key = progress_key
        self.total_files = 0
        self.processed_files = 0
        self.total_folders = 0
        self.processed_folders = 0
        self._status: Dict[str, any] = {
            "status": "in_progress",
            "progress": 0,
            "current_step": "Initializing...",
            "error": None,
            "start_time": datetime.now().isoformat(),
            "details": {
                "files_processed": 0,
                "folders_processed": 0,
                "current_file": None
            }
        }

    def set_total_items(self, files: int, folders: int):
        self.total_files = files
        self.total_folders = folders
        self._update_progress()

    def increment_processed_files(self, current_file: Optional[str] = None):
        self.processed_files += 1
        self._status["details"]["files_processed"] = self.processed_files
        self._status["details"]["current_file"] = current_file
        self._update_progress()

    def increment_processed_folders(self):
        self.processed_folders += 1
        self._status["details"]["folders_processed"] = self.processed_folders
        self._update_progress()

    def _update_progress(self):
        if self.total_files + self.total_folders == 0:
            return

        # Calculate progress percentage
        total_items = self.total_files + self.total_folders
        processed_items = self.processed_files + self.processed_folders
        progress = (processed_items / total_items) * 100

        # Update status
        self._status["progress"] = min(round(progress, 1), 99)  # Cap at 99% until complete
        self._update_step_message()

    def _update_step_message(self):
        progress = self._status["progress"]
        if progress < 20:
            self._status["current_step"] = "Analyzing project structure..."
        elif progress < 40:
            self._status["current_step"] = f"Processing files ({self.processed_files}/{self.total_files})"
        elif progress < 80:
            self._status["current_step"] = f"Generating folder documentation ({self.processed_folders}/{self.total_folders})"
        else:
            self._status["current_step"] = "Finalizing documentation..."

    def complete(self):
        self._status.update({
            "status": "completed",
            "progress": 100,
            "current_step": "Documentation generated successfully!",
            "completion_time": datetime.now().isoformat()
        })

    def fail(self, error: str):
        self._status.update({
            "status": "failed",
            "error": str(error),
            "current_step": "Generation failed",
            "failure_time": datetime.now().isoformat()
        })

    @property
    def status(self) -> dict:
        return self._status.copy()