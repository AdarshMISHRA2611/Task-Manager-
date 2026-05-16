from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import UserOut, UserRoleUpdate
from backend.utils.deps import AdminUser

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=List[UserOut])
def list_users(_: AdminUser, db: Session = Depends(get_db)) -> List[UserOut]:
    users = db.query(User).order_by(User.name.asc()).all()
    return [UserOut.model_validate(u) for u in users]


@router.patch("/{user_id}/role", response_model=UserOut)
def update_role(
    user_id: int,
    payload: UserRoleUpdate,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> UserOut:
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")

    new_role = payload.role.value
    if target.role == new_role:
        return UserOut.model_validate(target)

    if new_role == UserRole.Admin.value and not target.email.lower().endswith("@ethara.ai"):
        raise HTTPException(
            status_code=403,
            detail="Admin role is restricted to @ethara.ai email addresses",
        )

    if target.role == UserRole.Admin.value and new_role == UserRole.Member.value:
        admin_count = db.query(User).filter(User.role == UserRole.Admin.value).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="At least one admin is required")

    target.role = new_role
    db.add(target)
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)
