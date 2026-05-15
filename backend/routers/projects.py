from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Project, ProjectMember, User, UserRole
from backend.schemas.schemas import MemberAdd, ProjectCreate, ProjectMemberDetailOut, ProjectOut, ProjectUpdate
from backend.utils.deps import AdminUser, CurrentUser

router = APIRouter(prefix="/projects", tags=["projects"])


def _project_out(p: Project) -> ProjectOut:
    return ProjectOut(
        id=p.id,
        name=p.name,
        description=p.description,
        created_by=p.created_by,
        created_at=p.created_at,
    )


def _member_project_ids(db: Session, user_id: int) -> List[int]:
    rows = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == user_id).all()
    return [r[0] for r in rows]


def _get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _ensure_project_access(db: Session, user: User, project: Project) -> None:
    if UserRole(user.role) == UserRole.Admin:
        return
    member = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == user.id)
        .first()
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this project")


@router.get("", response_model=list[ProjectOut])
def list_projects(user: CurrentUser, db: Session = Depends(get_db)):
    if UserRole(user.role) == UserRole.Admin:
        projects = db.query(Project).order_by(Project.created_at.desc()).all()
    else:
        ids = _member_project_ids(db, user.id)
        if not ids:
            return []
        projects = db.query(Project).filter(Project.id.in_(ids)).order_by(Project.created_at.desc()).all()
    return [_project_out(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    user: AdminUser,
    payload: ProjectCreate,
    db: Session = Depends(get_db),
):
    project = Project(name=payload.name, description=payload.description, created_by=user.id)
    db.add(project)
    db.flush()
    db.add(ProjectMember(project_id=project.id, user_id=user.id))
    db.commit()
    db.refresh(project)
    return _project_out(project)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    _ensure_project_access(db, user, project)
    return _project_out(project)


@router.get("/{project_id}/members", response_model=list[ProjectMemberDetailOut])
def list_project_members(project_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    _ensure_project_access(db, user, project)
    rows = (
        db.query(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .filter(ProjectMember.project_id == project_id)
        .order_by(User.name.asc())
        .all()
    )
    return [
        ProjectMemberDetailOut(
            membership_id=pm.id,
            project_id=pm.project_id,
            user_id=u.id,
            name=u.name,
            email=u.email,
            role=UserRole(u.role),
        )
        for pm, u in rows
    ]


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    user: AdminUser,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(db, project_id)
    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = payload.description
    db.commit()
    db.refresh(project)
    return _project_out(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, user: AdminUser, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()
    return None


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
def add_member(
    project_id: int,
    user: AdminUser,
    payload: MemberAdd,
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(db, project_id)
    target = db.query(User).filter(User.id == payload.user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    exists = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == payload.user_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already in project")
    db.add(ProjectMember(project_id=project_id, user_id=payload.user_id))
    db.commit()
    return {"ok": True}


@router.delete("/{project_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    project_id: int,
    member_user_id: int,
    user: AdminUser,
    db: Session = Depends(get_db),
):
    _get_project_or_404(db, project_id)
    row = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == member_user_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    db.delete(row)
    db.commit()
    return None
