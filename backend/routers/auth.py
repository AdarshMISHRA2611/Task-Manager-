from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import Token, UserLogin, UserOut, UserSignup
from backend.utils.deps import CurrentUser
from backend.utils.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = User(
        name=payload.name,
        email=str(payload.email).lower(),
        password=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=UserRole(user.role),
        created_at=user.created_at,
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_access_token(str(user.id))
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role=UserRole(user.role),
        created_at=user.created_at,
    )
