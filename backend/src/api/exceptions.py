"""业务异常模块"""

from fastapi import status


class AppException(Exception):
    """应用异常基类。"""

    def __init__(self, code: str, message: str, http_status: int = status.HTTP_400_BAD_REQUEST):
        self.code = code
        self.message = message
        self.http_status = http_status


class NotFoundException(AppException):
    def __init__(self, entity: str, identifier: str = ''):
        super().__init__(
            code=f'{entity.upper()}_NOT_FOUND',
            message=f'{entity}未找到' + (f': {identifier}' if identifier else ''),
            http_status=status.HTTP_404_NOT_FOUND,
        )


class DuplicateException(AppException):
    def __init__(self, message: str = '资源已存在'):
        super().__init__(code='DUPLICATE', message=message, http_status=status.HTTP_409_CONFLICT)


class UnauthorizedException(AppException):
    def __init__(self, message: str = '未授权访问'):
        super().__init__(code='UNAUTHORIZED', message=message, http_status=status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    def __init__(self, message: str = '禁止访问'):
        super().__init__(code='FORBIDDEN', message=message, http_status=status.HTTP_403_FORBIDDEN)


class ValidationException(AppException):
    def __init__(self, message: str = '输入验证失败'):
        super().__init__(code='VALIDATION_ERROR', message=message, http_status=status.HTTP_422_UNPROCESSABLE_ENTITY)


class ServiceUnavailableException(AppException):
    def __init__(self, service: str = '服务'):
        super().__init__(
            code='SERVICE_UNAVAILABLE',
            message=f'{service}暂时不可用，请稍后重试',
            http_status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
