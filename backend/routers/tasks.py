from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Project, ProjectMember, Task, User, UserRole
from backend.schemas.schemas import TaskCreate, TaskOut, TaskUpdate
from backend.utils.deps import CurrentUser

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _ensure_project_member(db: Session, project_id: int, user_id: int) -> None:
    is_member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )
    if not is_member:
        raise HTTPException(status_code=400, detail="Assignee is not a member of this project")


@router.get("", response_model=List[TaskOut])
def list_tasks(current: CurrentUser, db: Session = Depends(get_db)) -> List[TaskOut]:
    if current.role == UserRole.Admin.value:
        rows = db.query(Task).order_by(Task.created_at.desc()).all()
    else:
        rows = (
            db.query(Task)
            .filter(Task.assigned_to == current.id)
            .order_by(Task.created_at.desc())
            .all()
        )
    return [TaskOut.model_validate(t) for t in rows]


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreate, current: CurrentUser, db: Session = Depends(get_db)) -> TaskOut:
    if current.role != UserRole.Admin.value:
        raise HTTPException(status_code=403, detail="Only admins can create tasks")
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.assigned_to is not None:
        user = db.get(User, payload.assigned_to)
        if not user:
            raise HTTPException(status_code=404, detail="Assignee not found")
        _ensure_project_member(db, project.id, user.id)
    task = Task(
        title=payload.title.strip(),
        description=payload.description or None,
        status=payload.status.value,
        assigned_to=payload.assigned_to,
        project_id=payload.project_id,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskOut.model_validate(task)


def _get_task_or_404(db: Session, task_id: int) -> Task:
    t = db.get(Task, task_id)
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, current: CurrentUser, db: Session = Depends(get_db)) -> TaskOut:
    task = _get_task_or_404(db, task_id)
    if current.role != UserRole.Admin.value and task.assigned_to != current.id:
        raise HTTPException(status_code=403, detail="You do not have access to this task")
    return TaskOut.model_validate(task)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current: CurrentUser,
    db: Session = Depends(get_db),
) -> TaskOut:
    task = _get_task_or_404(db, task_id)

    if current.role != UserRole.Admin.value:
        if task.assigned_to != current.id:
            raise HTTPException(status_code=403, detail="You do not have access to this task")
        if payload.status is None or any(
            v is not None for v in (payload.title, payload.description, payload.assigned_to, payload.due_date)
        ):
            raise HTTPException(status_code=403, detail="Members can only update task status")
        task.status = payload.status.value
        db.add(task)
        db.commit()
        db.refresh(task)
        return TaskOut.model_validate(task)

    if payload.title is not None:
        task.title = payload.title.strip()
    if payload.description is not None:
        task.description = payload.description or None
    if payload.status is not None:
        task.status = payload.status.value
    if payload.assigned_to is not None:
        if payload.assigned_to == 0:
            task.assigned_to = None
        else:
            user = db.get(User, payload.assigned_to)
            if not user:
                raise HTTPException(status_code=404, detail="Assignee not found")
            _ensure_project_member(db, task.project_id, user.id)
            task.assigned_to = payload.assigned_to
    if payload.due_date is not None:
        task.due_date = payload.due_date

    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskOut.model_validate(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, current: CurrentUser, db: Session = Depends(get_db)) -> None:
    task = _get_task_or_404(db, task_id)
    if current.role != UserRole.Admin.value:
        raise HTTPException(status_code=403, detail="Only admins can delete tasks")
    db.delete(task)
    db.commit()
    return None
