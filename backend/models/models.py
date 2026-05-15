import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.database.database import Base


class UserRole(str, enum.Enum):
    Admin = "Admin"
    Member = "Member"


class TaskStatus(str, enum.Enum):
    Queued = "Queued"
    Active = "Active"
    Done = "Done"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default=UserRole.Member.value)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project_memberships = relationship("ProjectMember", back_populates="user")
    created_projects = relationship("Project", back_populates="creator")
    assigned_tasks = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="created_projects")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")

    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_user"),)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default=TaskStatus.Queued.value)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assignee = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to])
    project = relationship("Project", back_populates="tasks")
