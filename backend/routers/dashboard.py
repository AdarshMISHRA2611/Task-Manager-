from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Task, TaskStatus
from backend.schemas.schemas import DashboardOut
from backend.utils.deps import CurrentUser

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _due_is_overdue(task: Task, now: datetime) -> bool:
    if task.status == TaskStatus.Completed.value:
        return False
    if not task.due_date:
        return False
    due = task.due_date
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    return due < now


@router.get("", response_model=DashboardOut)
def dashboard(current: CurrentUser, db: Session = Depends(get_db)) -> DashboardOut:
    query = db.query(Task)
    if current.role != "Admin":
        query = query.filter(Task.assigned_to == current.id)
    tasks = query.all()

    now = datetime.now(timezone.utc)
    total = len(tasks)
    todo = sum(1 for t in tasks if t.status == TaskStatus.Todo.value)
    in_progress = sum(1 for t in tasks if t.status == TaskStatus.InProgress.value)
    completed = sum(1 for t in tasks if t.status == TaskStatus.Completed.value)
    overdue = sum(1 for t in tasks if _due_is_overdue(t, now))

    return DashboardOut(
        total_tasks=total,
        todo_tasks=todo,
        in_progress_tasks=in_progress,
        completed_tasks=completed,
        overdue_tasks=overdue,
    )
