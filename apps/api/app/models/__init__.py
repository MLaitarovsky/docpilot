"""ORM models — import everything so Alembic can detect all tables."""

from app.models.clause import Clause
from app.models.comparison import Comparison
from app.models.document import Document
from app.models.extraction import Extraction
from app.models.team import Team
from app.models.user import User

__all__ = [
    "Clause",
    "Comparison",
    "Document",
    "Extraction",
    "Team",
    "User",
]
