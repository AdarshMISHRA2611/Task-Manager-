from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Project, ProjectMember, User, UserRole
from backend.schemas.schemas import (
    MemberAdd,
    ProjectCreate,
    ProjectMemberDetailOut,
    ProjectOut,
    ProjectUpdate,
)
from backend.utils.deps import AdminUser, CurrentUser

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _member_project_ids(db: Session, user_id: int) -> List[int]:
    rows = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == user_id).all()
    return [r[0] for r in rows]


def _get_project_or_404(db: Session, project_id: int) -> Project:
    p = db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _ensure_access(db: Session, project: Project, user: User) -> None:
    if user.role == UserRole.Admin.value:
        return
    is_member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == user.id)
        .first()
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="You do not have access to this project")


@router.get("", response_model=List[ProjectOut])
def list_projects(current: CurrentUser, db: Session = Depends(get_db)) -> List[ProjectOut]:
    if current.role == UserRole.Admin.value:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
    else:
        pids = _member_project_ids(db, current.id)
        projects = (
            db.query(Project)
            .filter(Project.id.in_(pids))
            .order_by(Project.created_at.desc())
            .all()
            if pids
            else []
        )
    return [ProjectOut.model_validate(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, admin: AdminUser, db: Session = Depends(get_db)) -> ProjectOut:
    project = Project(
        name=payload.name.strip(),
        description=(payload.description or None),
        created_by=admin.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    db.add(ProjectMember(project_id=project.id, user_id=admin.id))
    db.commit()
    return ProjectOut.model_validate(project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, current: CurrentUser, db: Session = Depends(get_db)) -> ProjectOut:
    project = _get_project_or_404(db, project_id)
    _ensure_access(db, project, current)
    return ProjectOut.model_validate(project)


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> ProjectOut:
    project = _get_project_or_404(db, project_id)
    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = payload.description or None
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, _: AdminUser, db: Session = Depends(get_db)) -> None:
    project = _get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()
    return None


@router.get("/{project_id}/members", response_model=List[ProjectMemberDetailOut])
def list_members(
    project_id: int, current: CurrentUser, db: Session = Depends(get_db)
) -> List[ProjectMemberDetailOut]:
    project = _get_project_or_404(db, project_id)
    _ensure_access(db, project, current)
    rows = (
        db.query(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .filter(ProjectMember.project_id == project_id)
        .order_by(User.name.asc())
        .all()
    )
    return [
        ProjectMemberDetailOut(
            membership_id=m.id,
            user_id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
        )
        for m, u in rows
    ]


@router.post("/{project_id}/members", response_model=ProjectMemberDetailOut, status_code=201)
def add_member(
    project_id: int,
    payload: MemberAdd,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> ProjectMemberDetailOut:
    project = _get_project_or_404(db, project_id)
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    exists = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == user.id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="User is already a member")
    member = ProjectMember(project_id=project.id, user_id=user.id)
    db.add(member)
    db.commit()
    db.refresh(member)
    return ProjectMemberDetailOut(
        membership_id=member.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
    )


@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(
    project_id: int,
    user_id: int,
    _: AdminUser,
    db: Session = Depends(get_db),
) -> None:
    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return None
