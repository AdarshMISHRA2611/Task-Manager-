from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Task, TaskStatus, UserRole
from backend.schemas.schemas import DashboardOut
from backend.utils.deps import CurrentUser

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _due_is_overdue(due: datetime | None, now: datetime, status: str) -> bool:
    if due is None or status == TaskStatus.Done.value:
        return False
    if due.tzinfo is None:
        due_aware = due.replace(tzinfo=timezone.utc)
    else:
        due_aware = due.astimezone(timezone.utc)
    return due_aware < now


@router.get("", response_model=DashboardOut)
def dashboard(user: CurrentUser, db: Session = Depends(get_db)):
    now = _utc_now()
    if UserRole(user.role) == UserRole.Admin:
        tasks = db.query(Task).all()
    else:
        tasks = db.query(Task).filter(Task.assigned_to == user.id).all()

    total = len(tasks)
    queued = sum(1 for t in tasks if t.status == TaskStatus.Queued.value)
    active = sum(1 for t in tasks if t.status == TaskStatus.Active.value)
    done = sum(1 for t in tasks if t.status == TaskStatus.Done.value)
    overdue = sum(1 for t in tasks if _due_is_overdue(t.due_date, now, t.status))

    return DashboardOut(
        total_tasks=total,
        queued_tasks=queued,
        active_tasks=active,
        done_tasks=done,
        overdue_tasks=overdue,
    )
