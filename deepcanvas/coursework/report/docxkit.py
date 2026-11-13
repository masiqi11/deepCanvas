"""Small python-docx helpers for a Chinese course report."""
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

BODY = '宋体'
HEAD = '黑体'
LATIN = 'Times New Roman'
MONO = 'Consolas'


def east_asian(run_or_style, name):
    rpr = run_or_style.element.get_or_add_rPr()
    fonts = rpr.find(qn('w:rFonts'))
    if fonts is None:
        fonts = OxmlElement('w:rFonts')
        rpr.append(fonts)
    fonts.set(qn('w:eastAsia'), name)


class Report:
    def __init__(self):
        self.doc = Document()
        self.fig = 0
        self.tab = 0
        self.chapter = 0
        sec = self.doc.sections[0]
        sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
        sec.left_margin = sec.right_margin = Cm(2.8)
        sec.top_margin, sec.bottom_margin = Cm(2.5), Cm(2.3)
        st = self.doc.styles
        normal = st['Normal']
        normal.font.name = LATIN
        normal.font.size = Pt(12)
        east_asian(normal, BODY)
        normal.paragraph_format.line_spacing = 1.5
        normal.paragraph_format.space_after = Pt(0)
        for level, size in ((1, 16), (2, 14), (3, 12)):
            h = st[f'Heading {level}']
            h.font.name = LATIN
            h.font.size = Pt(size)
            h.font.bold = True
            h.font.color.rgb = RGBColor(0, 0, 0)
            east_asian(h, HEAD)
            h.paragraph_format.space_before = Pt(18 if level == 1 else 12)
            h.paragraph_format.space_after = Pt(8 if level == 1 else 6)
            h.paragraph_format.line_spacing = 1.3
            h.paragraph_format.keep_with_next = True

    # text -----------------------------------------------------------------
    def h1(self, text):
        self.chapter += 1
        self.fig = 0
        self.tab = 0
        return self.doc.add_heading(f'{self.chapter} {text}', level=1)

    def h1_plain(self, text):
        return self.doc.add_heading(text, level=1)

    def h2(self, text):
        return self.doc.add_heading(text, level=2)

    def h3(self, text):
        return self.doc.add_heading(text, level=3)

    def p(self, text, indent=True, align=None, size=None, bold=False):
        para = self.doc.add_paragraph()
        if indent:
            para.paragraph_format.first_line_indent = Pt(24)
        if align == 'center':
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        else:
            para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        self.rich(para, text, size=size, bold=bold)
        return para

    def rich(self, para, text, size=None, bold=False):
        """Append text where **x** is bold and `x` is monospace."""
        import re
        for part in re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text):
            if not part:
                continue
            if part.startswith('**'):
                run = para.add_run(part[2:-2])
                run.bold = True
            elif part.startswith('`'):
                run = para.add_run(part[1:-1])
                run.font.name = MONO
                run.font.size = Pt(10.5)
            else:
                run = para.add_run(part)
                run.bold = bold
            if size is not None:
                run.font.size = Pt(size)

    def bullets(self, items, numbered=False):
        for i, item in enumerate(items, 1):
            para = self.doc.add_paragraph()
            para.paragraph_format.left_indent = Pt(24)
            para.paragraph_format.first_line_indent = Pt(-14)
            para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            self.rich(para, (f'{i}. ' if numbered else '• ') + item)

    def code(self, text, size=9):
        table = self.doc.add_table(rows=1, cols=1)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = table.cell(0, 0)
        shade(cell, 'F5F5F7')
        cell.paragraphs[0].text = ''
        first = True
        for line in text.rstrip('\n').split('\n'):
            para = cell.paragraphs[0] if first else cell.add_paragraph()
            first = False
            para.paragraph_format.line_spacing = 1.0
            run = para.add_run(line)
            run.font.name = MONO
            run.font.size = Pt(size)
            east_asian(run, BODY)
        self.doc.add_paragraph()

    # figures and tables -----------------------------------------------------
    def figure(self, path, caption, width_cm=15.4):
        self.fig += 1
        para = self.doc.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        para.paragraph_format.keep_with_next = True
        para.add_run().add_picture(path, width=Cm(width_cm))
        cap = self.doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = cap.add_run(f'图 {self.chapter}-{self.fig}  {caption}')
        run.font.size = Pt(10.5)
        east_asian(run, HEAD)
        return f'图 {self.chapter}-{self.fig}'

    def next_figure(self):
        return f'图 {self.chapter}-{self.fig + 1}'

    def next_table(self):
        return f'表 {self.chapter}-{self.tab + 1}'

    def table(self, caption, header, rows, widths=None, size=10.5):
        self.tab += 1
        cap = self.doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.paragraph_format.keep_with_next = True
        run = cap.add_run(f'表 {self.chapter}-{self.tab}  {caption}')
        run.font.size = Pt(10.5)
        east_asian(run, HEAD)
        table = self.doc.add_table(rows=1 + len(rows), cols=len(header))
        table.style = 'Table Grid'
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for r, values in enumerate([header] + rows):
            for c, value in enumerate(values):
                cell = table.cell(r, c)
                cell.paragraphs[0].text = ''
                para = cell.paragraphs[0]
                para.paragraph_format.line_spacing = 1.15
                para.paragraph_format.first_line_indent = Pt(0)
                self.rich(para, str(value), size=size, bold=(r == 0))
                if r == 0:
                    shade(cell, 'E8EAF6')
                if widths:
                    cell.width = Cm(widths[c])
        if widths:
            table.autofit = False
            for c, w in enumerate(widths):
                table.columns[c].width = Cm(w)
            grid = table._tbl.tblGrid
            for c, col in enumerate(grid.findall(qn('w:gridCol'))):
                col.set(qn('w:w'), str(int(Cm(widths[c]).twips)))
        self.doc.add_paragraph()
        return f'表 {self.chapter}-{self.tab}'

    # structure ---------------------------------------------------------------
    def page_break(self):
        self.doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    def toc(self):
        para = self.doc.add_paragraph()
        run = para.add_run()
        begin = OxmlElement('w:fldChar'); begin.set(qn('w:fldCharType'), 'begin')
        instr = OxmlElement('w:instrText'); instr.set(qn('xml:space'), 'preserve'); instr.text = 'TOC \\o "1-2" \\h \\z \\u'
        sep = OxmlElement('w:fldChar'); sep.set(qn('w:fldCharType'), 'separate')
        hint = OxmlElement('w:t'); hint.text = '（在 Word 中右键此处选择“更新域”即可生成目录）'
        end = OxmlElement('w:fldChar'); end.set(qn('w:fldCharType'), 'end')
        for el in (begin, instr, sep, hint, end):
            run._r.append(el)

    def page_numbers(self):
        sec = self.doc.add_section(WD_SECTION.NEW_PAGE)
        sec.footer.is_linked_to_previous = False
        para = sec.footer.paragraphs[0]
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run()
        for kind, text in (('begin', None), (None, 'PAGE'), ('end', None)):
            if kind:
                el = OxmlElement('w:fldChar'); el.set(qn('w:fldCharType'), kind)
            else:
                el = OxmlElement('w:instrText'); el.set(qn('xml:space'), 'preserve'); el.text = text
            run._r.append(el)
        pg = OxmlElement('w:pgNumType'); pg.set(qn('w:start'), '1')
        sec._sectPr.append(pg)

    def save(self, path):
        self.doc.settings.element.append(update_fields())
        self.doc.save(path)


def shade(cell, color):
    tcpr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), color)
    tcpr.append(shd)


def update_fields():
    el = OxmlElement('w:updateFields')
    el.set(qn('w:val'), 'true')
    return el
