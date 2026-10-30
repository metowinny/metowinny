"""Пересобирает полнотекстовый поиск из уже опубликованных HTML.
Не меняет HTML глав и не требует установки библиотек.
Запуск: python tools/rebuild_search.py
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
from verify_chapters import reader_html

ROOT = Path(__file__).resolve().parent.parent
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Extract(HTMLParser):
    def __init__(self, target):
        super().__init__(convert_charrefs=True)
        self.target = target
        self.level = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        classes = dict(attrs).get('class', '').split()
        if self.level == 0 and self.target in classes:
            self.level = 1
            return
        if self.level:
            if tag in ('br','hr'): self.parts.append(' ')
            if tag not in VOID: self.level += 1

    def handle_startendtag(self, tag, attrs):
        if self.level: self.parts.append(' ')

    def handle_endtag(self, tag):
        if self.level and tag not in VOID:
            self.level -= 1
            if tag in ('p','h1','h2','h3','h4','li','blockquote','summary','div'):
                self.parts.append(' ')

    def handle_data(self, data):
        if self.level: self.parts.append(data)


def extract(path: Path, css_class: str) -> str:
    parser=Extract(css_class)
    parser.feed(path.read_text(encoding='utf-8'))
    return re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()



class FullText(HTMLParser):
    """Текст из готового HTML-фрагмента: не зависит от вложенности тегов."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts=[]
    def handle_starttag(self, tag, attrs):
        if tag in ('br','hr'): self.parts.append(' ')
    def handle_data(self, data):
        self.parts.append(data)


def chapter_content(path):
    block=reader_html(path.read_bytes()).decode('utf-8')
    parser=FullText()
    parser.feed(block)
    return re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()


def add(result, path, title, kind, content, weight):
    if not content: raise ValueError(f'Не удалось извлечь текст из {path}')
    result.append({'url': path.relative_to(ROOT).as_posix(), 'title': title,
                   'type': kind, 'text': content, 'weight': weight})


def main():
    docs=[]
    chapters=sorted((ROOT/'glavy').glob('*.html'))
    for path in chapters:
        title=extract(path,'chapter-head__title') or path.stem
        add(docs,path,title,'Глава',chapter_content(path),3)
    for rel,title,selector,kind in [
        ('index.html','Главная — Нулевой Трибунал','about-grid','О проекте'),
        ('toma/index.html','Тома серии','page-head','Библиотека'),
        ('toma/usmirenie-boli.html','Усмирение Боли','tome-hero__text','Том'),
        ('glossary.html','Глоссарий','glossary-list','Глоссарий')]:
        path=ROOT/rel
        add(docs,path,title,kind,extract(path,selector),2)
    outfile=ROOT/'assets/search-index.json'
    outfile.write_text(json.dumps({'version':1,'items':docs},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(f'Индекс обновлён: {len(chapters)} глав, {len(docs)} документов, {outfile.stat().st_size//1024} КБ')
    print('Тексты глав не редактировались.')


if __name__=='__main__': main()
