from sqlalchemy import Column, Integer, String, Text, ForeignKey, ARRAY, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.types import UserDefinedType
from app.db.session import Base

class Vector(UserDefinedType):
    def __init__(self, dimensions):
        self.dimensions = dimensions

    def get_col_spec(self, **kw):
        return f"vector({self.dimensions})"

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    full_name = Column(String)
    age = Column(Integer)
    bio = Column(Text) # "Я люблю тишину и программировать по ночам"
    interests = Column(ARRAY(String)) # ["python", "gaming", "rock"]
    avatar_url = Column(Text, nullable=True)
    
    # 384 — это размерность вектора модели MiniLM
    embedding = Column(Vector(384)) 
    
    is_looking = Column(Boolean, default=True)

    user = relationship("User")