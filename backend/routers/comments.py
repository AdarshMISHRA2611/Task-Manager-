from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import ProjectMember, Task, TaskComment, UserRole
from backend.schemas.schemas import CommentCreate, CommentOut
from backend.utils.deps import CurrentUser

router = APIRouter(tags=["comments"])


def _ensure_task_access(task: Task, current, db: Session) -> None:
    if current.role == UserRole.Admin.value:
        return
    is_member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == task.project_id, ProjectMember.user_id == current.id)
        .first()
    )
    if is_member or task.assigned_to == current.id:
        return
    raise HTTPException(status_code=403, detail="You do not have access to this task")


def _to_out(comment: TaskComment) -> CommentOut:
    return CommentOut(
        id=comment.id,
        task_id=comment.task_id,
        user_id=comment.user_id,
        user_name=comment.user.name if comment.user else "Unknown",
        body="" if comment.deleted_at is not None else comment.body,
        deleted_at=comment.deleted_at,
        created_at=comment.created_at,
    )


@router.get("/api/tasks/{task_id}/comments", response_model=List[CommentOut])
def list_comments(task_id: int, current: CurrentUser, db: Session = Depends(get_db)) -> List[CommentOut]:
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    _ensure_task_access(task, current, db)
    comments = (
        db.query(TaskComment)
        .filter(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
        .all()
    )
    return [_to_out(c) for c in comments]


@router.post("/api/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    payload: CommentCreate,
    current: CurrentUser,
    db: Session = Depends(get_db),
) -> CommentOut:
    task = db.get(Task, payload.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    _ensure_task_access(task, current, db)

    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=400, detail="Comment body cannot be empty")

    comment = TaskComment(task_id=payload.task_id, user_id=current.id, body=body)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _to_out(comment)


@router.delete("/api/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, current: CurrentUser, db: Session = Depends(get_db)) -> Response:
    comment = db.get(TaskComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    task = db.get(Task, comment.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    _ensure_task_access(task, current, db)
    if comment.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Comment already deleted")
    if comment.user_id != current.id and current.role != UserRole.Admin.value:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    comment.deleted_at = datetime.now(timezone.utc)
    db.add(comment)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
