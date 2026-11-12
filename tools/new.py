#!/usr/bin/env python3
"""Create a new deck folder from templates/deck.

    python tools/new.py <name>

Creates decks/<name>/ with brief.md, sources.md, storyboard.md, review.md and deck.html.
Standard library only; Python 3.7+.
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if len(sys.argv) != 2 or not re.match(r'^[a-z0-9][a-z0-9-]*$', sys.argv[1]):
        sys.exit('usage: python tools/new.py <name>   (lowercase letters, digits, hyphens)')
    name = sys.argv[1]
    src = os.path.join(ROOT, 'templates', 'deck')
    dst = os.path.join(ROOT, 'decks', name)
    if os.path.exists(dst):
        sys.exit('decks/%s already exists' % name)
    os.makedirs(dst)
    for fn in sorted(os.listdir(src)):
        with io.open(os.path.join(src, fn), encoding='utf-8') as f:
            text = f.read().replace('{{name}}', name)
        with io.open(os.path.join(dst, fn), 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print('  decks/%s/%s' % (name, fn))
    print('next: fill in brief.md and sources.md, then storyboard.md (see entry/new.md)')


if __name__ == '__main__':
    main()
