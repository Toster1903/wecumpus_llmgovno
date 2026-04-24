from sqlalchemy import Column, Integer, String, Text, ForeignKey, ARRAY, Boolean, JSON
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.session import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    full_name = Column(String)
    age = Column(Integer)
    bio = Column(Text) # "Я люблю тишину и программировать по ночам"
    interests = Column(ARRAY(String)) # ["python", "gaming", "rock"]
    avatar_url = Column(Text, nullable=True)
    private_habits = Column(JSON, nullable=True)
    
    # 384 — это размерность вектора модели MiniLM
    embedding = Column(Vector(384)) 
    
    is_looking = Column(Boolean, default=True)

    user = relationship("User")
