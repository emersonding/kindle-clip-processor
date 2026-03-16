import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseClippings } from './index.ts';

const DELIMITER = '==========';

describe('parseClippings', () => {
  test('returns empty array for empty input', () => {
    const result = parseClippings('');
    assert.deepEqual(result, []);
  });

  test('returns empty array for input with only delimiters', () => {
    const result = parseClippings(DELIMITER + '\n' + DELIMITER);
    assert.deepEqual(result, []);
  });

  test('parses a simple single-book input correctly', () => {
    const input = `挪威的森林
- 您在第45页的标注 | 添加于 2016年3月1日星期二 下午2:30:00

生命的本质就是孤独。
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, '挪威的森林');
    assert.equal(result[0].highlights.length, 1);

    const h = result[0].highlights[0];
    assert.equal(h.title, '挪威的森林');
    assert.equal(h.metadata, '- 您在第45页的标注 | 添加于 2016年3月1日星期二 下午2:30:00');
    assert.equal(h.text, '生命的本质就是孤独。');
  });

  test('strips email from title', () => {
    const input = `舞!舞!舞! (bingshuishenshi@126.com)
- 您在位置 #133-134的标注 | 添加于 2015年9月24日星期四 上午5:08:43

我这人决没有什么不正常。我的确如此认为。
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, '舞!舞!舞!');
  });

  test('skips chunks with empty text', () => {
    const input = `挪威的森林
- 您在第45页的标注 | 添加于 2016年3月1日星期二 下午2:30:00

${DELIMITER}
挪威的森林
- 您在第46页的标注 | 添加于 2016年3月1日星期二 下午3:00:00

有内容的标注。
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].highlights.length, 1);
    assert.equal(result[0].highlights[0].text, '有内容的标注。');
  });

  test('groups multiple highlights from same book together', () => {
    const input = `挪威的森林
- 您在第45页的标注 | 添加于 2016年3月1日星期二 下午2:30:00

生命的本质就是孤独。
${DELIMITER}
挪威的森林
- 您在第100页的标注 | 添加于 2016年3月2日星期三 上午10:00:00

死并非生的对立面，而作为生的一部分永存。
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].title, '挪威的森林');
    assert.equal(result[0].highlights.length, 2);
    assert.equal(result[0].highlights[0].text, '生命的本质就是孤独。');
    assert.equal(result[0].highlights[1].text, '死并非生的对立面，而作为生的一部分永存。');
  });

  test('multiple books produce multiple Book entries', () => {
    const input = `舞!舞!舞! (bingshuishenshi@126.com)
- 您在位置 #133-134的标注 | 添加于 2015年9月24日星期四 上午5:08:43

我这人决没有什么不正常。我的确如此认为。
${DELIMITER}
挪威的森林
- 您在第45页的标注 | 添加于 2016年3月1日星期二 下午2:30:00

生命的本质就是孤独。
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result.length, 2);
    assert.equal(result[0].title, '舞!舞!舞!');
    assert.equal(result[1].title, '挪威的森林');
  });

  test('date parsing: correct year/month/day/hour/minute from Chinese metadata', () => {
    const input = `挪威的森林
- 您在第45页的标注 | 添加于 2016年3月1日星期二 下午3:30:00

生命的本质就是孤独。
${DELIMITER}`;

    const result = parseClippings(input);
    const date = result[0].highlights[0].date;
    assert.notEqual(date, null);
    assert.equal(date!.getFullYear(), 2016);
    assert.equal(date!.getMonth(), 2); // 0-indexed, March = 2
    assert.equal(date!.getDate(), 1);
    assert.equal(date!.getHours(), 15);
    assert.equal(date!.getMinutes(), 30);
    assert.equal(date!.getSeconds(), 0);
  });

  test('date is null when metadata has no Chinese date', () => {
    const input = `挪威の森
- Some metadata without date

日本語のテキスト。
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result[0].highlights[0].date, null);
  });

  test('multi-line highlight body is joined with newline', () => {
    const input = `挪威的森林
- 您在第50页的标注 | 添加于 2016年3月2日星期三 上午9:00:00

第一行内容。
第二行内容。
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].highlights.length, 1);
    assert.equal(result[0].highlights[0].text, '第一行内容。\n第二行内容。');
  });

  test('preserves order of first appearance for books', () => {
    const input = `Book C
- 您在第1页的标注 | 添加于 2020年1月1日星期三 上午8:00:00

Content C.
${DELIMITER}
Book A
- 您在第1页的标注 | 添加于 2020年1月2日星期四 上午8:00:00

Content A.
${DELIMITER}
Book B
- 您在第1页的标注 | 添加于 2020年1月3日星期五 上午8:00:00

Content B.
${DELIMITER}`;

    const result = parseClippings(input);
    assert.equal(result[0].title, 'Book C');
    assert.equal(result[1].title, 'Book A');
    assert.equal(result[2].title, 'Book B');
  });
});
