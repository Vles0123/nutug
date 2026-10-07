import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { labels, uiLocale } from '../src/ui-copy.mjs';
import { calendarCopy } from '../src/calendar-copy.mjs';
import { format, resolveConfig } from 'prettier';

const meanings = {
  brand: '产品名',
  previous: '浏览路径中的上一项',
  next: '浏览路径中的下一项',
  people: '历史人物导航',
  tribes: '历史部落导航',
  library: '历史文化资料导航',
  calendar: '日历导航',
  chronicle: '编年历史导航',
  search: '打开搜索或查找资料',
  close: '关闭当前浮层',
  clear: '清除已输入的检索文本',
  read: '打开条目正文',
  settings: '应用设置',
  type: '阅读文字大小',
  larger: '增大字号或放大图谱',
  smaller: '减小字号或缩小图谱',
  fit: '显示整张关系图',
  focus: '将当前节点移到画布中心',
  details: '打开完整条目',
  sources: '引用来源',
  relations: '条目之间的联系',
  all: '筛选范围中的全部条目',
  family: '亲属关系类型',
  power: '政治关系类型',
  timeline: '按时间浏览事件',
  back: '回到前一个阅读位置',
  more: '追加下一组目录结果',
  retry: '重试失败的操作',
  update: '检查或启用内容更新',
  download: '保存可离线读取的资料',
  saved: '资料已保存的状态',
  connection: '网络连接',
  directions: '黄历中的方位',
  explore: '按主题选择资料',
  catalog: '文章目录',
};
const entries = [];
function collect(scope, value, path = '') {
  for (const [key, text] of Object.entries(value)) {
    const id = path ? path + '.' + key : key;
    if (typeof text === 'string')
      entries.push({
        id: scope + '.' + id,
        text,
        context: scope === 'app' ? meanings[key] : scope + ' / ' + id,
        review: 'needs-native-review',
      });
    else if (text && typeof text === 'object') collect(scope, text, id);
  }
}
collect('app', labels);
collect('calendar-app', calendarCopy);
for (const [name, global] of [
  ['knowledge', 'KNOWLEDGE'],
  ['tribes', 'TRIBAL_GRAPH'],
  ['tribal-knowledge', 'TRIBAL_KNOWLEDGE'],
  ['calendar', 'MONGOL_CALENDAR'],
  ['almanac', 'CHINESE_ALMANAC_CONFIG'],
]) {
  const source = await readFile('content-source/' + name + '-data.js', 'utf8');
  collect(name, JSON.parse(vm.runInNewContext(source + ';JSON.stringify(' + global + '.ui)')));
}
const concepts = [
  'today',
  'all',
  'close',
  'read',
  'search',
  'source',
  'sources',
  'back',
  'previous',
  'next',
  'selectDate',
];
const differingForms = concepts.flatMap((key) => {
  const matches = entries.filter((entry) => entry.id.split('.').at(-1) === key);
  return new Set(matches.map((entry) => entry.text)).size > 1
    ? [{ concept: key, entries: matches.map(({ id, text }) => ({ id, text })) }]
    : [];
});
const report = {
  locale: uiLocale,
  convention: '中国境内规范传统蒙古文，内蒙古通行用法',
  reviewMeaning: '词表是待核查清单；用例、字形覆盖与运行测试分别记录，语言审校需逐条确认。',
  references: [
    { url: 'https://www.w3.org/TR/mlreq/', use: '输入、选区、字列推进、整词与后缀的排版要求' },
    { url: 'https://www.mongolfont.com/mn/grammer/jirvlga.html', use: 'ᠳᠣᠷᠤᠭᠰᠢ 的书写方向用例' },
    {
      url: 'https://tohoku.repo.nii.ac.jp/record/51255/files/Toh-Asi-Ken-2006-20.pdf',
      use: 'ᠳᠣᠷᠤᠭᠰᠢ (dorugsi) 的文献词形',
    },
    { url: 'https://ci.nii.ac.jp/ncid/BA5897934X', use: 'ᠭᠠᠷᠴᠠᠭ 的书目用例；界面用途仍需母语审阅' },
  ],
  corrections: [
    {
      id: 'vertical-script',
      fields: ['summary', 'body[0]'],
      before: 'ᠳᠣᠣᠭᠰᠢ',
      after: 'ᠳᠣᠷᠤᠭᠰᠢ',
      basis: '用户指出原词错误，替换形式有书写方向用例；完整句子仍列入语言审校。',
    },
    {
      id: 'app.explore',
      before: 'ᠰᠤᠳᠤᠯᠬᠤ',
      after: labels.explore,
      basis: '入口实际作用为主题选择；复用现有主题名词并单独记录用途。',
    },
    {
      id: 'catalog-view',
      before: labels.all,
      after: labels.catalog,
      basis: '区分文章目录入口与筛选范围，补充可追溯词形用例。',
    },
  ],
  totals: { entries: entries.length, nativeReviewed: 0, differingConcepts: differingForms.length },
  differingForms,
  entries,
};
await writeFile(
  'docs/ui-copy-review.json',
  await format(JSON.stringify(report), {
    ...(await resolveConfig('docs/ui-copy-review.json')),
    parser: 'json',
  }),
);
console.log(JSON.stringify(report.totals));
