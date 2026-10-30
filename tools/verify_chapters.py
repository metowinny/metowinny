"""Без зависимостей: проверка неизменности HTML самого текста 16 глав.
Запуск из корня сайта: python tools/verify_chapters.py
"""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
TOKEN = re.compile(rb'<div\b[^>]*>|</div\s*>', re.I | re.S)
START = re.compile(rb'<div\s+class\s*=\s*["\']reader["\']\s*>', re.I)


def reader_html(data: bytes) -> bytes:
    match = START.search(data)
    if match is None:
        raise ValueError('Не найден блок <div class="reader">')
    depth = 1
    for token in TOKEN.finditer(data, match.end()):
        depth += -1 if token.group().lower().startswith(b'</div') else 1
        if depth == 0:
            return data[match.start():token.end()]
    raise ValueError('Не закрыт блок reader')


def get_hash(path: Path) -> str:
    return hashlib.sha256(reader_html(path.read_bytes())).hexdigest()


def main():
    saved = json.loads((ROOT/'tools'/'chapter_integrity.json').read_text(encoding='utf-8'))
    errors=[]
    for filename, expected in saved.items():
        p=ROOT/'glavy'/filename
        if not p.exists():
            errors.append(f'НЕТ ФАЙЛА: {filename}')
            continue
        actual=get_hash(p)
        if actual != expected: errors.append(f'ОТЛИЧИЕ В ТЕКСТЕ: {filename}')
        else: print(f'OK: {filename}')
    print(f'Проверено: {len(saved)} файлов; ошибок: {len(errors)}')
    if errors:
        for e in errors:print(e)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
