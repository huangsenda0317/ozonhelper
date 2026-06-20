"""认证相关 Pydantic Schemas"""

import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

PHONE_PATTERN = re.compile(r'^1[3-9]\d{9}$')


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str


class SmsSendRequest(BaseModel):
    phone: str = Field(min_length=11, max_length=11)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not PHONE_PATTERN.match(value):
            raise ValueError('手机号格式不正确')
        return value


class SmsLoginRequest(BaseModel):
    phone: str = Field(min_length=11, max_length=11)
    code: str = Field(min_length=4, max_length=8)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not PHONE_PATTERN.match(value):
            raise ValueError('手机号格式不正确')
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    expires_in: int


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    is_active: bool
    last_used_at: datetime | None
    created_at: datetime


class ApiKeyCreatedResponse(ApiKeyResponse):
    key: str  # 完整密钥，仅创建时返回一次
