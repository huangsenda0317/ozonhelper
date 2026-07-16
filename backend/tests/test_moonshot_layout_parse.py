from src.services.ai_processor.moonshot_vision import parse_layout_response


def test_parse_layout_json_fence():
    raw = """```json
    [{"id":"a","x":0.1,"y":0.8,"fontSize":42,"align":"center"}]
    ```"""
    got = parse_layout_response(raw, valid_ids={'a'})
    assert got == [{'id': 'a', 'x': 0.1, 'y': 0.8, 'fontSize': 42, 'align': 'center'}]


def test_parse_clamps_and_filters():
    raw = '[{"id":"a","x":1.5,"y":-1},{"id":"b","x":0.2,"y":0.3}]'
    got = parse_layout_response(raw, valid_ids={'a'})
    assert len(got) == 1
    assert got[0]['x'] == 1.0
    assert got[0]['y'] == 0.0
