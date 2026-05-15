from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.models.models import TaskStatus, UserRole


# --- Auth ---
class UserSignup(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.Member

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Projects ---
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_strip(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Project name is required")
        return v.strip()


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectMemberOut(BaseModel):
    id: int
    project_id: int
    user_id: int

    model_config = {"from_attributes": True}


class ProjectMemberDetailOut(BaseModel):
    membership_id: int
    project_id: int
    user_id: int
    name: str
    email: str
    role: UserRole


# --- Tasks ---
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.Queued
    assigned_to: Optional[int] = None
    project_id: int
    due_date: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def title_strip(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Task title is required")
        return v.strip()


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    assigned_to: Optional[int] = None
    project_id: Optional[int] = None
    due_date: Optional[datetime] = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    assigned_to: Optional[int]
    project_id: int
    due_date: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Members ---
class MemberAdd(BaseModel):
    user_id: int = Field(..., gt=0)


# --- Dashboard ---
class DashboardOut(BaseModel):
    total_tasks: int
    queued_tasks: int
    active_tasks: int
    done_tasks: int
    overdue_tasks: int
