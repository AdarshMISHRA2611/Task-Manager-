from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import UserOut
from backend.utils.deps import AdminUser

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(_admin: AdminUser, db: Session = Depends(get_db)):
    """Admin-only directory for inviting members and assigning work."""
    users = db.query(User).order_by(User.name.asc()).all()
    return [
        UserOut(id=u.id, name=u.name, email=u.email, role=UserRole(u.role), created_at=u.created_at)
        for u in users
    ]
