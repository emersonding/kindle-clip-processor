#!/usr/bin/env python
# -*- coding: utf-8 -*-
import datetime
import re
import argparse

input_path = 'resource/clip.txt'
output_path = 'resource/output.txt'
chunk_delimiter = '=========='
context_setting = dict(help_option_names=['-h', '--help'])


class Chunk:
    def __init__(self, raw_chunk):
        self.title, self.metadata, self.text = self.normalize_chunk(raw_chunk)
        self.date = self.extract_date()

    def normalize_chunk(self, raw_chunk):
        """
        Chunk is combined with title | metadata | paragraph, e.g.:
        ```
            舞!舞!舞!
            - 您在位置 #133-134的标注 | 添加于 2015年9月24日星期四 上午5:08:43
            我这人决没有什么不正常。 我的确如此认为。
        ```

        Normalize includes:
        * filter empty lines.
        * transform string to list.
        """
        lines = raw_chunk.split('\n')
        chunk = strip_empty_strings(lines)
        # Some clips have email addr in title, e.g. "title (email)"
        title = chunk[0].replace('(bingshuishenshi@126.com)', '')
        metadata = chunk[1]
        # some note has title and metadata, but empty text body
        text = '\n'.join(chunk[2:]) if len(chunk) >= 2 else ''

        return title, metadata, text

    def extract_date(self):
        """
        Extract date from metadata.
        Metadata sample: "- 您在位置 #133-134的标注 | 添加于 2015年9月24日星期四 上午5:08:43".
        """
        date_regex = re.search(r"(\d+)年(\d+)月(\d+)日", self.metadata)
        return datetime.date(int(date_regex.group(1)), int(date_regex.group(2)), int(date_regex.group(3)))



def get_file():
    f = open(input_path, 'r')
    return f


def get_file_string(f):
    s = ''
    for line in f:
        s += line
    return s


def get_raw_chunks(s):
    raw_chunks = s.split(chunk_delimiter)
    return strip_empty_strings(raw_chunks)


def get_chunks(raw_chunks):
    return list(map(lambda c: Chunk(c), raw_chunks))


def normalize_chunks(chunks):
    """
    filter empty lines.
    transform string to list.
    """
    new_chunks = []
    for chunk in chunks:
        lines = chunk.split('\n')
        new_chunk = strip_empty_strings(lines)
        new_chunks.append(new_chunk)
    return new_chunks


def classify_chunks(chunks):
    dict = {}
    for chunk in chunks:
        if chunk.text is None:
            continue
        if dict.get(chunk.title) is None:
            dict[chunk.title] = []
        dict[chunk.title].append(chunk.text)
    return dict


def test_chunks(chunks):
    for chunk in chunks:
        if len(chunk) > 3:
            print('chunk size test fail')
            return
    print('chunk size test success')


def print_chunk_dict(chunk_dict):
    for title in chunk_dict:
        print('**********')
        print(title, '\n')
        for line in chunk_dict[title]:
            print(line, '\n')


def print_titles(chunk_dict):
    print("*" * 10)
    print("Title:")
    for chunk in chunk_dict:
        print(chunk)
    print("*" * 10)


def output_file(chunk_dict):
    f = open(output_path, 'w')

    f.write("Titles \n")
    for chunk in chunk_dict:
        f.write(chunk + '\n')
    f.write("{} \n\n".format("=" * 10))

    f.write("Novels \n")
    for chunk in chunk_dict:
        f.write(chunk + '\n')
        for line in chunk_dict[chunk]:
            f.write(line + '\n\n')
        f.write('\n\n')

    f.close()


def strip_empty_strings(strings):
    non_empty_strings = []
    for s in strings:
        # will remove space and \n
        s = s.strip()
        if s != '':
            non_empty_strings.append(s)

    return non_empty_strings


def fetch_date_filtering_option():
    parser = argparse.ArgumentParser(description='Input date')
    parser.add_argument('--date', '-d', required=False,
                        help='filter clip after the input date')
    args = parser.parse_args()
    filter_date = None
    if args.date is not None:
        filter_date = datetime.datetime.strptime(str(args.date), '%Y-%m-%d').date()
    print('Filtering notes after: {}'.format(filter_date))
    return filter_date


def filter_chunks_by_date(chunks, filter_date):
    if filter_date is None:
        return chunks
    filtered_chunks = []
    for chunk in chunks:
        if chunk.date >= filter_date:
            filtered_chunks.append(chunk)
    return filtered_chunks
    # return list(map(lambda c: c.date >= filter_date, chunks))


if __name__ == '__main__':
    filter_date = fetch_date_filtering_option()

    f = get_file()
    s = get_file_string(f)
    raw_chunks = get_raw_chunks(s)
    chunks = get_chunks(raw_chunks)
    filtered_chunks = filter_chunks_by_date(chunks, filter_date)
    chunk_dict = classify_chunks(filtered_chunks)
    print_titles(chunk_dict)
    print_chunk_dict(chunk_dict)
    output_file(chunk_dict)
