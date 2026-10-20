/**
 * The OpenUI component library DeepCanvas answers are written in: primitives
 * the model arranges itself, generic functions so a page computes with its own
 * state, and the clipboard action. Adapted from Open Intelligent UI
 * (MIT, Copyright (c) 2026 Thesys Inc.); components that need the network
 * (photo search, street maps, video embeds) are left out.
 */
import { createLibrary } from '@openuidev/react-lang'
import { actions } from './actions.ts'
import { functions } from './functions/index.ts'
import './library/theme.css'
import './library/components.css'
import { Chart } from './library/chart.tsx'
import { Carousel, Celebration, Code, Flashcard, MathBlock, Popover, Quote } from './library/extra.tsx'
import {
  Button, Checkbox, DatePicker, IconButton, Input, Pressable, RadioGroup, SegmentedControl, Select, Slider, TextArea, Timer,
} from './library/controls.tsx'
import { HtmlView } from './library/html-view.tsx'
import { Box, Card, Col, Divider, Form, Grid, Row, Spacer } from './library/layout.tsx'
import { Icon, Image } from './library/media.tsx'
import { svgComponents } from './library/svg.tsx'
import { Table } from './library/table.tsx'
import { Badge, Caption, Label, Link, List, ListItem, Markdown, Text, Title } from './library/text.tsx'

/** The library every `openui` fence renders against. */
export const library = createLibrary({
  root: 'Col',
  components: [
    Col, Row, Box, Grid, Card, Carousel, Popover, Divider, Spacer,
    Title, Text, Caption, Label, Badge, Link, List, ListItem, Markdown, Quote, Code, MathBlock,
    Button, IconButton, Pressable, Input, TextArea, Select, SegmentedControl, Slider, Checkbox, RadioGroup, DatePicker, Timer, Form,
    Image, Icon, Table, Chart,
    Flashcard, Celebration,
    ...svgComponents, HtmlView,
  ],
  functions,
  actions,
  componentGroups: [
    {
      name: 'Layout',
      components: ['Col', 'Row', 'Box', 'Grid', 'Card', 'Carousel', 'Popover', 'Divider', 'Spacer'],
      notes: [
        '- gap and padding count 4px steps. Length is px or a CSS length like "50%". Radius is "sm", "md", "lg", "xl", "full" or px.',
        '- Color is "ink", "muted", "faint", "surface", "info", "success", "warning", "danger", "purple", "pink", "chart1" to "chart6", or a CSS color. '
          + 'As a background, status colors are soft tints.',
      ],
    },
    { name: 'Text', components: ['Title', 'Text', 'Caption', 'Label', 'Badge', 'Link', 'List', 'ListItem', 'Markdown', 'Quote', 'Code', 'Math'] },
    {
      name: 'Inputs',
      components: [
        'Button', 'IconButton', 'Pressable', 'Input', 'TextArea', 'Select', 'SegmentedControl', 'Slider', 'Checkbox', 'RadioGroup', 'DatePicker', 'Timer', 'Form',
      ],
      notes: [
        "- An input's first argument is its value, usually a $variable that other statements read.",
        '- Every input either changes something shown on the page, or sits in a Form whose submit Button sends a short first-person @ToAssistant '
          + '("Help me choose a bike"); the form values go with it. No dead inputs.',
      ],
    },
    { name: 'Media and data', components: ['Image', 'Icon', 'Table', 'Chart'] },
    { name: 'Play', components: ['Flashcard', 'Celebration'] },
    { name: 'Drawing', components: ['Svg', 'G', 'Circle', 'Ellipse', 'Rect', 'Line', 'Path', 'Polyline', 'Polygon', 'SvgText', 'HtmlView'] },
  ],
})
