#!/usr/bin/env python3
"""Bundle a deck into one self-contained HTML file.

    python tools/build.py decks/<name>            ->  dist/<name>.html
    python tools/build.py decks/<name> -o out.html

Inlines every local stylesheet, script, image and JSON/CSV data block, so the
result works offline, from file://, and on hosts that block iframes and
cross-file requests. Fails if anything still points at the network.
Standard library only; Python 3.7+.
"""
import base64
import io
import mimetypes
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with io.open(path, encoding='utf-8') as f:
        return f.read()


def is_remote(url):
    return bool(re.match(r'^(https?:)?//', url))


def data_uri(path):
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    with open(path, 'rb') as f:
        return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode('ascii'))


def attr(tag, name):
    m = re.search(r'\b%s\s*=\s*("([^"]*)"|\'([^\']*)\')' % re.escape(name), tag)
    return (m.group(2) if m.group(2) is not None else m.group(3)) if m else None


def build(deck_dir, out_path):
    src = os.path.join(deck_dir, 'deck.html')
    if not os.path.isfile(src):
        sys.exit('no deck.html in %s' % deck_dir)
    html = read(src)
    problems = []
    inlined = []

    def local(url):
        return os.path.normpath(os.path.join(deck_dir, url.split('?')[0].split('#')[0]))

    # <link rel="stylesheet" href="...">
    def css(m):
        tag, href = m.group(0), attr(m.group(0), 'href')
        if 'stylesheet' not in tag or not href or href.startswith('data:'):
            return tag
        if is_remote(href):
            problems.append('remote stylesheet: ' + href)
            return tag
        inlined.append(href)
        return '<style>\n%s\n</style>' % read(local(href))
    html = re.sub(r'<link\b[^>]*>', css, html)

    # <script src="..."></script>   (including <script type="application/json" src="...">)
    def js(m):
        open_tag, src_url = m.group(1), attr(m.group(1), 'src')
        if not src_url or src_url.startswith('data:'):
            return m.group(0)
        if is_remote(src_url):
            problems.append('remote script: ' + src_url)
            return m.group(0)
        inlined.append(src_url)
        body = read(local(src_url)).replace('</script', '<\\/script')
        clean = re.sub(r'\s+src\s*=\s*("[^"]*"|\'[^\']*\')', '', open_tag)
        return '%s\n%s\n</script>' % (clean, body)
    html = re.sub(r'(<script\b[^>]*>)\s*</script>', js, html)

    # <img src>, <video src>, <source src>, <audio src>
    def media(m):
        tag, src_url = m.group(0), attr(m.group(0), 'src')
        if not src_url or src_url.startswith('data:'):
            return tag
        if is_remote(src_url):
            problems.append('remote media: ' + src_url)
            return tag
        inlined.append(src_url)
        return tag.replace(src_url, data_uri(local(src_url)))
    html = re.sub(r'<(?:img|video|audio|source)\b[^>]*>', media, html)

    if re.search(r'<iframe\b', html):
        problems.append('iframe found: hosted pages blank them out; inline the content instead')
    for m in re.finditer(r'url\(\s*["\']?((?:https?:)?//[^)"\']+)', html):
        problems.append('remote url() in CSS: ' + m.group(1))
    for m in re.finditer(r'\bfetch\(\s*["\'](?!data:)([^"\']+)', html):
        problems.append('fetch("%s"): load data from an inline <script type="application/json"> instead' % m.group(1))

    if problems:
        print('build failed — the deck is not self-contained:')
        for p in problems:
            print('  - ' + p)
        sys.exit(1)

    out_dir = os.path.dirname(out_path)
    if out_dir and not os.path.isdir(out_dir):
        os.makedirs(out_dir)
    with io.open(out_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    size = os.path.getsize(out_path) / 1024.0
    print('%s  (%.0f KB, %d files inlined)' % (os.path.relpath(out_path, ROOT), size, len(inlined)))
    if size > 8 * 1024:
        print('note: over 8 MB — first load will be slow; consider trimming embedded data')
    print('open it, press R, and make sure the review shows 0 errors before sharing')


def main():
    args = sys.argv[1:]
    if not args or args[0] in ('-h', '--help'):
        sys.exit(__doc__)
    deck_dir = os.path.abspath(args[0])
    name = os.path.basename(deck_dir.rstrip('/\\'))
    out = os.path.join(ROOT, 'dist', name + '.html')
    if '-o' in args:
        out = os.path.abspath(args[args.index('-o') + 1])
    build(deck_dir, out)


if __name__ == '__main__':
    main()
