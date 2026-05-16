from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import (
    Token,
    UserLogin,
    UserMeUpdate,
    UserOut,
    UserSignup,
)
from backend.utils.deps import CurrentUser
from backend.utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


ADMIN_EMAIL_DOMAIN = "@ethara.ai"


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignup, db: Session = Depends(get_db)) -> UserOut:
    email = payload.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already in use")

    requested_role = payload.role or UserRole.Member
    if requested_role == UserRole.Admin and not email.endswith(ADMIN_EMAIL_DOMAIN):
        raise HTTPException(
            status_code=403,
            detail=f"Admin role is restricted to {ADMIN_EMAIL_DOMAIN} email addresses",
        )

    user = User(
        name=payload.name.strip(),
        email=email,
        password=hash_password(payload.password),
        role=requested_role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    email = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if payload.role is not None and payload.role == UserRole.Admin and not email.endswith(ADMIN_EMAIL_DOMAIN):
        raise HTTPException(
            status_code=403,
            detail=f"Admin sign-in requires an {ADMIN_EMAIL_DOMAIN} email address",
        )
    if payload.role is not None and user.role != payload.role.value:
        raise HTTPException(
            status_code=401,
            detail=f"This account is signed up as {user.role}. Please choose the correct option.",
        )
    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current: CurrentUser) -> UserOut:
    return UserOut.model_validate(current)


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserMeUpdate,
    current: CurrentUser,
    db: Session = Depends(get_db),
) -> UserOut:
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        current.name = name

    if payload.email is not None:
        new_email = payload.email.lower().strip()
        if new_email != current.email:
            exists = db.query(User).filter(User.email == new_email, User.id != current.id).first()
            if exists:
                raise HTTPException(status_code=400, detail="Email is already in use")
            current.email = new_email

    if payload.new_password is not None:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to set a new password")
        if not verify_password(payload.current_password, current.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current.password = hash_password(payload.new_password)

    db.add(current)
    db.commit()
    db.refresh(current)
    return UserOut.model_validate(current)
