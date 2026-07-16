import pytest
from pydantic import ValidationError

from src.schemas.ai import CompleteAnnotationRequest, WorkflowSubmitRequest


def test_workflow_requires_enabled_step():
    with pytest.raises(ValidationError):
        WorkflowSubmitRequest(
            image_url='http://x',
            object_name='a/b.jpg',
            steps=[{'id': 'cutout', 'enabled': False, 'order': 0}],
        )


def test_complete_annotation_requires_image_unless_skip():
    with pytest.raises(ValidationError):
        CompleteAnnotationRequest(skip=False)
    ok = CompleteAnnotationRequest(skip=True)
    assert ok.skip is True
