"""Store 凭证加解密与 Ozon 客户端工厂"""

from src.models.store import Store
from src.services.crypto import decrypt_value, encrypt_value
from src.services.ozon.client import OzonSellerClient


def encrypt_store_credentials(client_id: str, api_key: str) -> tuple[str, str]:
    return encrypt_value(client_id), encrypt_value(api_key)


def decrypt_store_client_id(store: Store) -> str:
    return decrypt_value(store.ozon_client_id)


def decrypt_store_api_key(store: Store) -> str:
    return decrypt_value(store.ozon_api_key_encrypted)


def ozon_client_for_store(store: Store) -> OzonSellerClient:
    return OzonSellerClient.from_credentials(
        client_id=decrypt_store_client_id(store),
        api_key=decrypt_store_api_key(store),
    )
