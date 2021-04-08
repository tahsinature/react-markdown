/* eslint-env jest */
/* eslint-disable react/prop-types */
const fs = require('fs')
const path = require('path')
const React = require('react')
const gfm = require('remark-gfm')
const visit = require('unist-util-visit')
const ReactDom = require('react-dom/server')
const renderer = require('react-test-renderer')
const math = require('remark-math')
const TeX = require('@matejmazur/react-katex')
const {render} = require('@testing-library/react')
const htmlParser = require('../src/plugins/html-parser')
const Markdown = require('../src/react-markdown')
const MarkdownWithHtml = require('../src/with-html')
const toc = require('remark-toc')

const renderHTML = (input) => ReactDom.renderToStaticMarkup(input).replace(/^<div>|<\/div>$/g, '')

test('can render the most basic of documents (single paragraph)', () => {
  const component = renderer.create(<Markdown>Test</Markdown>)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should warn when passed `source`', () => {
  const warn = console.warn
  console.warn = jest.fn()
  expect(renderHTML(<Markdown source="a">b</Markdown>)).toEqual('<p>b</p>')
  expect(console.warn).toHaveBeenCalledWith(
    '[react-markdown] Warning: please use `children` instead of `source`'
  )
  console.warn = warn
})

test('should warn when passed `escapeHtml`', () => {
  const warn = console.warn
  console.warn = jest.fn()
  expect(renderHTML(<Markdown escapeHtml>b</Markdown>)).toEqual('<p>b</p>')
  expect(console.warn).toHaveBeenCalledWith(
    '[react-markdown] Warning: please use `allowDangerousHtml` instead of `escapeHtml`'
  )
  console.warn = warn
})

test('uses passed classname for root component', () => {
  const component = renderer.create(<Markdown className="md">Test</Markdown>)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle multiple paragraphs properly', () => {
  const input = 'React is awesome\nAnd so is markdown\n\nCombining = epic'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle multiline paragraphs properly (softbreak, paragraphs)', () => {
  const input = 'React is awesome\nAnd so is markdown  \nCombining = epic'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle emphasis', () => {
  const input = 'React is _totally_ *awesome*'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle bold/strong text', () => {
  const input = 'React is __totally__ **awesome**'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle links without title attribute', () => {
  const input = 'This is [a link](https://espen.codes/) to Espen.Codes.'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle links with title attribute', () => {
  const input = 'This is [a link](https://espen.codes/ "some title") to Espen.Codes.'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle links with uppercase protocol', () => {
  const input = 'This is [a link](HTTPS://ESPEN.CODES/) to Espen.Codes.'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle links with custom uri transformer', () => {
  const input = 'This is [a link](https://espen.codes/) to Espen.Codes.'
  const transform = (uri) => uri.replace(/^https?:/, '')
  const component = renderer.create(<Markdown transformLinkUri={transform} children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should use target attribute for links if specified', () => {
  const input = 'This is [a link](https://espen.codes/) to Espen.Codes.'
  const component = renderer.create(<Markdown linkTarget="_blank" children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should call function to get target attribute for links if specified', () => {
  const input = 'This is [a link](https://espen.codes/) to Espen.Codes.'
  const getTarget = (uri) => (uri.match(/^http/) ? '_blank' : undefined)
  const component = renderer.create(<Markdown linkTarget={getTarget} children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should support images without alt, url, or title', () => {
  const input = '![]()'
  const actual = renderHTML(<Markdown children={input} transformLinkUri={null} />)
  const expected = '<p><img src="" alt=""/></p>'
  expect(actual).toEqual(expected)
})

test('should handle images without title attribute', () => {
  const input = 'This is ![an image](/ninja.png).'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle images with title attribute', () => {
  const input = 'This is ![an image](/ninja.png "foo bar").'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle images with custom uri transformer', () => {
  const input = 'This is ![an image](/ninja.png).'
  const transform = (uri) => uri.replace(/\.png$/, '.jpg')
  const component = renderer.create(<Markdown transformImageUri={transform} children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle image references with custom uri transformer', () => {
  const input = 'This is ![The Waffle Ninja][ninja].\n\n[ninja]: https://some.host/img.png'
  const transform = (uri) => uri.replace(/\.png$/, '.jpg')
  const component = renderer.create(<Markdown transformImageUri={transform} children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should support images references without alt, url, or title', () => {
  const input = '![][a]\n\n[a]: <>'
  const actual = renderHTML(<Markdown children={input} transformLinkUri={null} />)
  const expected = '<p><img src="" alt=""/></p>'
  expect(actual).toEqual(expected)
})

test('should handle images with special characters in alternative text', () => {
  const input = "This is ![a ninja's image](/ninja.png)."
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render headers', () => {
  expect(renderHTML(<Markdown children={'# Awesome'} />)).toEqual('<h1>Awesome</h1>')
  expect(renderHTML(<Markdown children={'## Awesome'} />)).toEqual('<h2>Awesome</h2>')
  expect(renderHTML(<Markdown children={'### Awesome'} />)).toEqual('<h3>Awesome</h3>')
  expect(renderHTML(<Markdown children={'#### Awesome'} />)).toEqual('<h4>Awesome</h4>')
  expect(renderHTML(<Markdown children={'##### Awesome'} />)).toEqual('<h5>Awesome</h5>')
})

test('should be able to render inline code', () => {
  const input = 'Just call `renderToStaticMarkup()`, already'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle code tags without any language specification', () => {
  const input = "```\nvar foo = require('bar');\nfoo();\n```"
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle code tags with language specification', () => {
  const input = "```js\nvar foo = require('bar');\nfoo();\n```"
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should only use first language definition on code blocks', () => {
  const input = "```js foo bar\nvar foo = require('bar');\nfoo();\n```"
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should support character references in code blocks', () => {
  const input = `~~~js&#x0a;ololo&#x0a;i&#x0a;can&#x0a;haz&#x0a;class&#x0a;names&#x0a;!@#$%^&*()_
  woop
  ~~~`
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle code blocks by indentation', () => {
  const input = ['', '<footer class="footer">\n', '', '&copy; 2014 Foo Bar\n', '</footer>'].join(
    '    '
  )
  expect(renderHTML(<Markdown children={input} />)).toMatchSnapshot()
})

test('should handle blockquotes', () => {
  const input = '> Moo\n> Tools\n> FTW\n'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle nested blockquotes', () => {
  const input = [
    '> > Lots of ex-Mootoolers on the React team\n>\n',
    "> Totally didn't know that.\n>\n",
    "> > There's a reason why it turned out so awesome\n>\n",
    "> Haha I guess you're right!"
  ].join('')

  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle tight, unordered lists', () => {
  const input = '* Unordered\n* Lists\n* Are cool\n'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle loose, unordered lists', () => {
  const input = '- foo\n\n- bar'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle tight, unordered lists with sublists', () => {
  const input = '* Unordered\n  * Lists\n    * Are cool\n'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle loose, unordered lists with sublists', () => {
  const input = '- foo\n\n  - bar'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle ordered lists', () => {
  const input = '1. Ordered\n2. Lists\n3. Are cool\n'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle ordered lists with a start index', () => {
  const input = '7. Ordered\n8. Lists\n9. Are cool\n'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should pass `ordered`, `depth`, `checked`, `index` to list/listItem', () => {
  const input = '- foo\n\n  2. bar\n  3. baz\n\n- root\n'
  const list = (name) => {
    const fn = ({node, ordered, depth, ...props}) => {
      expect(ordered).toBe(name === 'ol')
      expect(depth).toBeGreaterThanOrEqual(0)
      return React.createElement(name, props)
    }
    fn.displayName = name
    return fn
  }
  const li = ({node, ordered, checked, index, ...props}) => {
    expect(ordered).not.toBeUndefined()
    expect(checked).toBe(null)
    expect(index).toBeGreaterThanOrEqual(0)
    return React.createElement('li', props)
  }
  const components = {li, ol: list('ol'), ul: list('ul')}
  const component = renderer.create(<Markdown children={input} components={components} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should pass `inline: true` to inline code', () => {
  const input = '```\na\n```\n\n\tb\n\n`c`'
  const actual = renderHTML(
    <Markdown
      children={input}
      components={{
        code({node, inline, ...props}) {
          expect(inline === undefined || inline === true).toBe(true)
          return React.createElement('code', props)
        }
      }}
    />
  )
  const expected = '<pre><code>a\n</code></pre>\n<pre><code>b\n</code></pre>\n<p><code>c</code></p>'
  expect(actual).toEqual(expected)
})

test('should pass `isHeader: boolean` to `tr`s', () => {
  const input = '| a |\n| - |\n| b |\n| c |'
  const actual = renderHTML(
    <Markdown
      children={input}
      remarkPlugins={[gfm]}
      components={{
        tr({node, isHeader, ...props}) {
          expect(typeof isHeader === 'boolean').toBe(true)
          return React.createElement('tr', props)
        }
      }}
    />
  )
  const expected =
    '<table>\n<thead>\n<tr>\n<th>a</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>b</td>\n</tr>\n<tr>\n<td>c</td>\n</tr>\n</tbody>\n</table>'
  expect(actual).toEqual(expected)
})

test('should pass `isHeader: true` to `th`s, `isHeader: false` to `td`s', () => {
  const input = '| a |\n| - |\n| b |\n| c |'
  const actual = renderHTML(
    <Markdown
      children={input}
      remarkPlugins={[gfm]}
      components={{
        th({node, isHeader, ...props}) {
          expect(isHeader).toBe(true)
          return React.createElement('th', props)
        },
        td({node, isHeader, ...props}) {
          expect(isHeader).toBe(false)
          return React.createElement('td', props)
        }
      }}
    />
  )
  const expected =
    '<table>\n<thead>\n<tr>\n<th>a</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>b</td>\n</tr>\n<tr>\n<td>c</td>\n</tr>\n</tbody>\n</table>'
  expect(actual).toEqual(expected)
})

test('should pass `index: number`, `ordered: boolean`, `checked: boolean | null` to `li`s', () => {
  const input = '* [x] a\n* [ ] b\n* c'
  let count = 0
  const actual = renderHTML(
    <Markdown
      children={input}
      remarkPlugins={[gfm]}
      components={{
        li({node, checked, index, ordered, ...props}) {
          expect(index).toBe(count)
          expect(ordered).toBe(false)
          // eslint-disable-next-line no-nested-ternary
          expect(checked).toBe(count === 0 ? true : count === 1 ? false : null)
          count++
          return React.createElement('li', props)
        }
      }}
    />
  )
  const expected =
    '<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" checked="" disabled=""/> a</li>\n<li class="task-list-item"><input type="checkbox" disabled=""/> b</li>\n<li>c</li>\n</ul>'
  expect(actual).toEqual(expected)
})

test('should pass `level: number` to `h1`, `h2`, ...', () => {
  const input = '#\n##\n###'
  function heading({node, level, ...props}) {
    return React.createElement(`h${level}`, props)
  }
  const actual = renderHTML(
    <Markdown children={input} components={{h1: heading, h2: heading, h3: heading}} />
  )
  const expected = '<h1></h1>\n<h2></h2>\n<h3></h3>'
  expect(actual).toEqual(expected)
})

test('should handle inline html with allowDangerousHtml option enabled', () => {
  const input = 'I am having <strong>so</strong> much fun'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render basic inline html without containers', () => {
  const input = 'I am having <strong>so</strong> much fun'
  const component = renderer.create(<Markdown children={input} allowDangerousHtml />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render inline html in totally unsatisfying, weird ways', () => {
  const input = 'I am having <span class="foo">so</span> much fun'
  const component = renderer.create(<Markdown children={input} allowDangerousHtml />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render inline html properly with HTML parser plugin', () => {
  const input = 'I am having <span class="foo">so</span> much fun'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render inline html properly with HTML parser plugin (through require)', () => {
  const input = 'I am having <span class="foo">so</span> much fun'
  const component = renderer.create(<MarkdownWithHtml children={input} allowDangerousHtml />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render inline html with nested markdown properly with HTML parser plugin', () => {
  const input = 'I am having <span class="foo">*so*</span> much fun'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render inline html with self-closing tags properly with HTML parser plugin', () => {
  const input = 'I am having <wbr/> so much fun'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render inline html with self-closing tags with attributes properly with HTML parser plugin', () => {
  const input = 'I am having <wbr class="foo"/> so much fun'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render inline html with self-closing tags with attributes properly with HTML parser plugin (#2)', () => {
  const input = 'I am having <wbr class="foo"/> so much fun'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render multiple inline html elements with self-closing tags with attributes properly with HTML parser plugin', () => {
  const input = 'I am having <wbr class="foo"/> so much <wbr class="bar"/> fun'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render a table with a single child with HTML parser plugin', () => {
  const input = '<table><tbody><tr><td>I am having so much fun</td></tr></tbody></table>'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render a table with multiple children with HTML parser plugin', () => {
  const input =
    '<table><thead><tr><th>Title</th></tr></thead><tbody><tr><td>I am having so much fun</td></tr></tbody></table>'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render replaced non-void html elements with HTML parser plugin', () => {
  const input = 'I am having <code>so much</code> fun'
  const config = {
    isValidNode: () => true,
    processingInstructions: [
      {
        shouldProcessNode: ({name}) => name === 'code',
        // eslint-disable-next-line react/display-name
        processNode: (_, children) => <kbd>{children}</kbd>
      }
    ]
  }
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser(config)} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle invalid HTML with HTML parser plugin', () => {
  const input = 'I am having <div> so much</em> fun'
  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should skip inline html with skipHtml option enabled', () => {
  const input = 'I am having <strong>so</strong> much fun'
  const component = renderer.create(<Markdown children={input} skipHtml />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle html blocks', () => {
  const input = [
    'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
    '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
    ' regular paragraph.'
  ].join('')

  const component = renderer.create(<Markdown children={input} allowDangerousHtml />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should escape html blocks by default', () => {
  const input = [
    'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
    '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
    ' regular paragraph.'
  ].join('')

  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should skip html blocks if skipHtml prop is set', () => {
  const input = [
    'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
    '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
    ' regular paragraph.'
  ].join('')

  const component = renderer.create(<Markdown children={input} allowDangerousHtml skipHtml />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should skip html blocks if skipHtml prop is set (with HTML parser plugin)', () => {
  const input = [
    'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
    '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
    ' regular paragraph.'
  ].join('')

  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml skipHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should escape html blocks by default (with HTML parser plugin)', () => {
  const input = [
    'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
    '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
    ' regular paragraph.'
  ].join('')

  const component = renderer.create(<Markdown children={input} htmlParser={htmlParser()} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle html blocks with HTML parser plugin', () => {
  const input = [
    'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
    '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
    ' regular paragraph.'
  ].join('')

  const component = renderer.create(
    <Markdown children={input} allowDangerousHtml htmlParser={htmlParser()} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should handle horizontal rules', () => {
  const input = 'Foo\n\n------------\n\nBar'
  const component = renderer.create(<Markdown children={input} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should set source position attributes if sourcePos option is enabled', () => {
  const input = 'Foo\n\n------------\n\nBar'
  const component = renderer.create(<Markdown children={input} sourcePos />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should support `sourcePos` with html', () => {
  const input = '<i>!</i>'
  const actual = renderHTML(<MarkdownWithHtml children={input} sourcePos allowDangerousHtml />)
  const expected = '<p data-sourcepos="1:1-1:9"><i data-sourcepos="1:1-1:9">!</i></p>'
  expect(actual).toEqual(expected)
})

test('should pass on raw source position to non-tag components if rawSourcePos option is enabled', () => {
  const input = '*Foo*\n\n------------\n\n__Bar__'
  const em = (props) => {
    expect(props.sourcePosition).toMatchSnapshot()
    return <em className="custom">{props.children}</em>
  }
  const component = renderer.create(<Markdown children={input} components={{em}} rawSourcePos />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should skip nodes that are not defined as allowed', () => {
  const input = '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2'
  const allowed = ['p', 'ol', 'li']
  const component = renderer.create(<Markdown children={input} allowedElements={allowed} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should skip nodes that are defined as disallowed', () => {
  const input = '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2\n\nFoo'
  const component = renderer.create(<Markdown children={input} disallowedElements={['li']} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should unwrap child nodes from disallowed nodes, if unwrapDisallowed option is enabled', () => {
  const input = 'Espen *~~initiated~~ had the initial commit*, but has had several **contributors**'
  const component = renderer.create(
    <Markdown
      children={input}
      disallowedElements={['em', 'strong']}
      unwrapDisallowed
      remarkPlugins={[gfm]}
    />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should render tables', () => {
  const input = [
    'Languages are fun, right?',
    '',
    '| ID  | English | Norwegian | Italian |',
    '| :-- | :-----: | --------: | ------- |',
    '| 1   | one     | en        | uno     |',
    '| 2   | two     | to        | due     |',
    '| 3   | three   | tre       | tre     |',
    ''
  ].join('\n')

  expect(renderHTML(<Markdown children={input} remarkPlugins={[gfm]} />)).toMatchSnapshot()
})

test('should render partial tables', () => {
  const input = 'User is writing a table by hand\n\n| Test | Test |\n|-|-|'

  expect(renderHTML(<Markdown children={input} remarkPlugins={[gfm]} />)).toMatchSnapshot()
})

test('should render link references', () => {
  const input = [
    'Stuff were changed in [1.1.4]. Check out the changelog for reference.',
    '',
    '[1.1.4]: https://github.com/remarkjs/react-markdown/compare/v1.1.3...v1.1.4'
  ].join('\n')

  expect(renderHTML(<Markdown children={input} />)).toMatchSnapshot()
})

test('should render empty link references', () => {
  const input = 'Stuff were changed in [][]. Check out the changelog for reference.'

  expect(renderHTML(<Markdown children={input} />)).toMatchSnapshot()
})

test('should render image references', () => {
  const input = [
    'Checkout out this ninja: ![The Waffle Ninja][ninja]. Pretty neat, eh?',
    '',
    '[ninja]: /assets/ninja.png'
  ].join('\n')

  expect(renderHTML(<Markdown children={input} />)).toMatchSnapshot()
})

test('should support definitions with funky keys', () => {
  const input = '[][__proto__] and [][constructor]\n\n[__proto__]: a\n[constructor]: b'
  const actual = renderHTML(<Markdown children={input} transformLinkUri={null} />)
  const expected = '<p><a href="a"></a> and <a href="b"></a></p>'
  expect(actual).toEqual(expected)
})

test('should support duplicate definitions', () => {
  const input = '[a][]\n\n[a]: b\n[a]: c'
  const actual = renderHTML(<Markdown children={input} transformLinkUri={null} />)
  const expected = '<p><a href="b">a</a></p>'
  expect(actual).toEqual(expected)
})

describe('should skip nodes that are defined as disallowed', () => {
  const samples = {
    p: {input: 'Paragraphs are cool', shouldNotContain: 'Paragraphs are cool'},
    h1: {input: '# Headers are neat', shouldNotContain: 'Headers are neat'},
    br: {input: 'Text  \nHardbreak', shouldNotContain: '<br/>'},
    a: {input: "[Espen's blog](http://espen.codes/) yeh?", shouldNotContain: '<a'},
    img: {input: 'Holy ![ninja](/ninja.png), batman', shouldNotContain: '<img'},
    em: {input: 'Many *contributors*', shouldNotContain: '<em'},
    code: {input: "```\nvar moo = require('bar');\nmoo();\n```", shouldNotContain: '<pre><code>'},
    blockquote: {input: '> Moo\n> Tools\n> FTW\n', shouldNotContain: '<blockquote'},
    ul: {input: '* A list\n*Of things', shouldNotContain: 'Of things'},
    li: {input: '* IPA\n*Imperial Stout\n', shouldNotContain: '<li'},
    strong: {input: "Don't **give up**, alright?", shouldNotContain: 'give up'},
    hr: {input: '\n-----\nAnd with that...', shouldNotContain: '<hr'}
  }

  const fullInput = Object.keys(samples).reduce((input, sampleType) => {
    return `${input + samples[sampleType].input}\n`
  }, '')

  Object.keys(samples).forEach((tagName) => {
    test(tagName, () => {
      const sample = samples[tagName]

      expect(
        renderHTML(
          <Markdown children={fullInput} disallowedElements={[tagName]} allowDangerousHtml />
        )
      ).not.toContain(sample.shouldNotContain)

      // Just for sanity's sake, let ensure that the opposite is true
      expect(renderHTML(<Markdown allowDangerousHtml children={fullInput} />)).toContain(
        sample.shouldNotContain
      )
    })
  })
})

test('should throw if html parser is used without config', () => {
  expect(() => {
    renderHTML(<Markdown children="" htmlParser={htmlParser} allowDangerousHtml />)
  }).toThrow(/called before use/i)
})

test('should throw if both allowed and disallowed types is specified', () => {
  expect(() => {
    renderHTML(<Markdown children="" allowedElements={['p']} disallowedElements={['a']} />)
  }).toThrow(/Only one of/i)
})

test('should be able to use a custom function to determine if the node should be allowed', () => {
  const input = [
    '# Header',
    '[react-markdown](https://github.com/remarkjs/react-markdown/) is a nice helper',
    'Also check out [my website](https://espen.codes/)'
  ].join('\n\n')
  const allow = (element) =>
    element.tagName !== 'a' || element.properties.href.indexOf('https://github.com/') === 0

  expect(renderHTML(<Markdown allowElement={allow} children={input} />)).toEqual(
    [
      '<h1>Header</h1>',
      '<p><a href="https://github.com/remarkjs/react-markdown/">react-markdown</a> is a nice helper</p>',
      '<p>Also check out </p>'
    ].join('\n')
  )
})

test('should be able to override components', () => {
  const input = '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2\n\nFoo'
  const heading = (level) => {
    const fn = (props) => <span className={`heading level-${level}`}>{props.children}</span>
    fn.displayName = `h${level}`
    return fn
  }
  const component = renderer.create(
    <Markdown children={input} components={{h1: heading(1), h2: heading(2)}} />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should throw on invalid component', () => {
  const input = '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2\n\nFoo'
  const components = {h1: 123}
  expect(() => renderHTML(<Markdown children={input} components={components} />)).toThrow(
    /Component for name `h1`/
  )
})

test('can render the whole spectrum of markdown within a single run', (done) => {
  fs.readFile(path.join(__dirname, 'fixtures', 'runthrough.md'), 'utf8', (err, fixture) => {
    if (err) {
      done(err)
      return
    }

    const component = renderer.create(
      <Markdown children={fixture} remarkPlugins={[gfm]} allowDangerousHtml />
    )
    expect(component.toJSON()).toMatchSnapshot()
    done()
  })
})

test('can render the whole spectrum of markdown within a single run (with html parser)', (done) => {
  fs.readFile(path.join(__dirname, 'fixtures', 'runthrough.md'), 'utf8', (err, fixture) => {
    if (err) {
      done(err)
      return
    }

    const component = renderer.create(
      <MarkdownWithHtml children={fixture} remarkPlugins={[gfm]} allowDangerousHtml />
    )
    expect(component.toJSON()).toMatchSnapshot()
    done()
  })
})

test('should support math', () => {
  function handle({node, ...props}) {
    if (node.properties.className && node.properties.className.includes('math')) {
      return (
        <TeX
          block={!node.properties.className.includes('math-inline')}
          math={node.children[0].value}
        />
      )
    }

    return React.createElement(node.tagName, props)
  }

  const input =
    'Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following equation.\n\n$$\nL = \\frac{1}{2} \\rho v^2 S C_L\n$$'

  const component = render(
    <Markdown children={input} remarkPlugins={[math]} components={{div: handle, span: handle}} />
  ).container.innerHTML

  expect(component).toMatchSnapshot()
})

test('can match and reactify cheap/simple inline html', () => {
  const input = 'So <ins>arbitrary *tags* wont</ins> just work.'
  expect(renderHTML(<Markdown children={input} allowDangerousHtml />)).toEqual(
    '<p>So <ins>arbitrary <em>tags</em> wont</ins> just work.</p>'
  )
})

test('can match multiple simple inline tags', () => {
  const input = 'So <ins>arbitrary</ins> <em>things</em>?'
  expect(renderHTML(<Markdown children={input} allowDangerousHtml />)).toEqual(
    '<p>So <ins>arbitrary</ins> <em>things</em>?</p>'
  )
})

test('can match nested simple inline tags', () => {
  const input = 'So <ins>arbitrary <em>things</em> are cool</ins>?'
  expect(renderHTML(<Markdown children={input} allowDangerousHtml />)).toEqual(
    '<p>So <ins>arbitrary <em>things</em> are cool</ins>?</p>'
  )
})

test('can match and reactify self-closing, attributeless html', () => {
  const input = 'Can I insert a horizontal rule?\n\n<hr />\n\nYup, looks like it.'
  expect(renderHTML(<Markdown children={input} allowDangerousHtml />)).toEqual(
    '<p>Can I insert a horizontal rule?</p><hr/><p>Yup, looks like it.</p>'
  )
})

test('can match and reactify self-closing, attributeless html (whitelist)', () => {
  const input = 'Can I insert a horizontal rule?\n\n<hr>\n\nYup, looks like it.'
  expect(renderHTML(<Markdown children={input} allowDangerousHtml />)).toEqual(
    '<p>Can I insert a horizontal rule?</p><hr/><p>Yup, looks like it.</p>'
  )
})

test('sanitizes certain dangerous urls for links by default', () => {
  const input = [
    '# [Much fun](javascript:alert("foo"))',
    "Can be had with [XSS links](vbscript:foobar('test'))",
    '> And [other](VBSCRIPT:bap) nonsense... [files](file:///etc/passwd) for instance',
    '## [Entities]( javascript&#x3A;alert("bazinga")) can be tricky, too',
    'Regular [links](https://foo.bar) must [be]() allowed',
    '[Some ref][xss]',
    '[xss]: javascript:alert("foo") "Dangerous stuff"',
    'Should allow [mailto](mailto:ex@ample.com) and [tel](tel:13133) links tho',
    'Also, [protocol-agnostic](//google.com) should be allowed',
    'local [paths](/foo/bar) should be [allowed](foo)',
    'allow [weird](?javascript:foo) query strings and [hashes](foo#vbscript:orders)'
  ].join('\n\n')

  const component = renderer.create(<Markdown children={input} allowDangerousHtml />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('allows specifying a custom URI-transformer', () => {
  const input =
    'Received a great [pull request](https://github.com/remarkjs/react-markdown/pull/15) today'

  const transform = (uri) => uri.replace(/^https?:\/\/github\.com\//i, '/')
  const component = renderer.create(<Markdown children={input} transformLinkUri={transform} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should support turning off the default URI transform', () => {
  const input = '[a](data:text/html,<script>alert(1)</script>)'
  const actual = renderHTML(<Markdown children={input} transformLinkUri={null} />)
  const expected = '<p><a href="data:text/html,%3Cscript%3Ealert(1)%3C/script%3E">a</a></p>'
  expect(actual).toEqual(expected)
})

test('can use parser plugins', () => {
  const input = 'a ~b~ c'

  const component = renderer.create(<Markdown children={input} remarkPlugins={[gfm]} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('supports checkbox lists', () => {
  const input = '- [ ] Foo\n- [x] Bar\n\n---\n\n- Foo\n- Bar'
  const component = renderer.create(<Markdown children={input} remarkPlugins={[gfm]} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should pass index of a node under its parent to components if `includeElementIndex` option is enabled', () => {
  const input = 'Foo\n\nBar\n\nBaz'
  const p = ({node, ...otherProps}) => {
    expect(otherProps).toMatchSnapshot()
    return <p>{otherProps.children}</p>
  }

  const component = renderer.create(
    <Markdown components={{p}} children={input} includeElementIndex />
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should be able to render components with forwardRef in HOC', () => {
  const componentWrapper = (WrappedComponent) => {
    // eslint-disable-next-line react/display-name
    return React.forwardRef((props, ref) => <WrappedComponent ref={ref} {...props} />)
  }

  const components = {
    a: componentWrapper((props) => <a {...props} />)
  }

  const component = renderer.create(
    <Markdown components={components}>[Link](https://example.com/)</Markdown>
  )
  expect(component.toJSON()).toMatchSnapshot()
})

test('should render table of contents plugin', () => {
  const input = [
    '# Header',
    '## Table of Contents',
    '## First Section',
    '## Second Section',
    '### Subsection',
    '## Third Section'
  ].join('\n')

  const component = renderer.create(<Markdown children={input} remarkPlugins={[toc]} />)
  expect(component.toJSON()).toMatchSnapshot()
})

test('should pass `node` as prop to all non-tag/non-fragment components', () => {
  const input = "# So, *headers... they're _cool_*\n\n"
  const h1 = (props) => {
    let text = ''
    visit(props.node, 'text', (child) => {
      text += child.value
    })
    return text
  }

  const component = renderer.create(<Markdown components={{h1}} children={input} />)
  expect(component.toJSON()).toBe("So, headers... they're cool")
})

test('should support formatting at the start of a GFM tasklist (GH-494)', () => {
  const input = '- [ ] *a*'
  const actual = renderHTML(<Markdown children={input} remarkPlugins={[gfm]} />)
  const expected =
    '<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" disabled=""/> <em>a</em></li>\n</ul>'
  expect(actual).toEqual(expected)
})

test('should not crash on weird `html-to-react` results', () => {
  const input = '<ruby><ruby></ruby></ruby>'
  const actual = renderHTML(<MarkdownWithHtml allowDangerousHtml children={input} />)
  // Note: this is not conforming to how browsers deal with it.
  const expected = '<p><ruby></ruby><ruby></ruby></p>'
  expect(actual).toEqual(expected)
})

test('should support aria properties', () => {
  const input = 'c'
  const plugin = () => (tree) => {
    tree.children.unshift({
      type: 'element',
      tagName: 'input',
      properties: {id: 'a', ariaDescribedBy: 'b', required: true},
      children: []
    })
  }
  const actual = renderHTML(<Markdown rehypePlugins={[plugin]} children={input} />)
  const expected = '<input id="a" aria-describedby="b" required=""/><p>c</p>'
  expect(actual).toEqual(expected)
})

test('should support data properties', () => {
  const input = 'b'
  const plugin = () => (tree) => {
    tree.children.unshift({
      type: 'element',
      tagName: 'i',
      properties: {dataWhatever: 'a'},
      children: []
    })
  }
  const actual = renderHTML(<Markdown rehypePlugins={[plugin]} children={input} />)
  const expected = '<i data-whatever="a"></i><p>b</p>'
  expect(actual).toEqual(expected)
})

test('should support comma separated properties', () => {
  const input = 'c'
  const plugin = () => (tree) => {
    tree.children.unshift({
      type: 'element',
      tagName: 'i',
      properties: {accept: ['a', 'b']},
      children: []
    })
  }
  const actual = renderHTML(<Markdown rehypePlugins={[plugin]} children={input} />)
  const expected = '<i accept="a, b"></i><p>c</p>'
  expect(actual).toEqual(expected)
})

test('should support `style` properties', () => {
  const input = 'a'
  const plugin = () => (tree) => {
    tree.children.unshift({
      type: 'element',
      tagName: 'i',
      properties: {style: 'color: red; font-weight: bold'},
      children: []
    })
  }
  const actual = renderHTML(<Markdown rehypePlugins={[plugin]} children={input} />)
  const expected = '<i style="color:red;font-weight:bold"></i><p>a</p>'
  expect(actual).toEqual(expected)
})

test('should support `style` properties w/ vendor prefixes', () => {
  const input = 'a'
  const plugin = () => (tree) => {
    tree.children.unshift({
      type: 'element',
      tagName: 'i',
      properties: {style: '-ms-b: 1; -webkit-c: 2'},
      children: []
    })
  }
  const actual = renderHTML(<Markdown rehypePlugins={[plugin]} children={input} />)
  const expected = '<i style="-ms-b:1;-webkit-c:2"></i><p>a</p>'
  expect(actual).toEqual(expected)
})

test('should support broken `style` properties', () => {
  const input = 'a'
  const plugin = () => (tree) => {
    tree.children.unshift({
      type: 'element',
      tagName: 'i',
      properties: {style: 'broken'},
      children: []
    })
  }
  const actual = renderHTML(<Markdown rehypePlugins={[plugin]} children={input} />)
  const expected = '<i></i><p>a</p>'
  expect(actual).toEqual(expected)
})

test('should support SVG elements', () => {
  const input = 'a'
  const plugin = () => (tree) => {
    tree.children.unshift({
      type: 'element',
      tagName: 'svg',
      properties: {xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 500 500'},
      children: [
        {
          type: 'element',
          tagName: 'title',
          properties: {},
          children: [{type: 'text', value: 'SVG `<circle>` element'}]
        },
        {type: 'element', tagName: 'circle', properties: {cx: 120, cy: 120, r: 100}, children: []}
      ]
    })
  }
  const actual = renderHTML(<Markdown rehypePlugins={[plugin]} children={input} />)
  const expected =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><title>SVG `&lt;circle&gt;` element</title><circle cx="120" cy="120" r="100"></circle></svg><p>a</p>'
  expect(actual).toEqual(expected)
})
