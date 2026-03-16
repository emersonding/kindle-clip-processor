#!/usr/bin/env python
# -*- coding: utf-8 -*-
import datetime
from unittest import TestCase
import kindle_clipper_processor as main


class TestKindleClipperProcessor(TestCase):
    sample_chunks = """
    舞!舞!舞!  
    - 您在位置 #77-81的标注 | 添加于 2015年9月24日星期四 上午4:58:35
    
    以前，在学校里经常搞自我介绍。每次编班，都要依序走到教室前边...
    ==========
    舞!舞!舞!  
    - 您在位置 #133-134的标注 | 添加于 2015年9月24日星期四 上午5:08:43
    
    我这人决没有什么不正常。我的确如此认为。
    
    至于别人怎么看我，我并不大介意。因为别人怎么看与我无关。那与其说是我的问题， 莫如说是他们的问题。
    ==========
    """

    sample_chunk = """
            舞!舞!舞!
            - 您在位置 #133-134的标注 | 添加于 2015年9月24日星期四 上午5:08:43
            我这人决没有什么不正常。 我的确如此认为。
    """

    def test_strip_empty_string(self):
        test_strings = ['test', 'test2 ', '\n', '', ' ', '   ', '\n  ']
        expected = ['test', 'test2']
        assert expected == main.strip_empty_strings(test_strings)

    def test_chunk_constructor(self):
        raw_chunks = main.get_raw_chunks(self.sample_chunks)
        chunks = main.get_chunks(raw_chunks)

        assert len(chunks) == 2
        assert chunks[0].title == '舞!舞!舞!'
        assert chunks[0].date == datetime.date(2015, 9, 24)
        assert chunks[0].text == '以前，在学校里经常搞自我介绍。每次编班，都要依序走到教室前边...'
