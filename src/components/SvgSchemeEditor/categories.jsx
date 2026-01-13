import { Button, Space, Input, Upload, ColorPicker, Flex } from 'antd'
import { DeleteOutlined, UploadOutlined, ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { setCurrentColor, toText } from '../../utils/utils'
import s from './svg-scheme-editor.module.scss'

export default function Categories(props) {
  const { items, onChange, deleteCategory, reorder } = props

  return (
    <Flex gap={16} wrap>
      {(items || []).map((item, i) => (
        <Flex gap={8} key={item.value} className={s.catItem} align='center'>
          {!item.icon ?
            <Upload
              accept='.svg'
              itemRender={() => null}
              customRequest={e => toText(e.file).then(setCurrentColor).then(icon => onChange(i, 'icon', icon))}
            >
              <Button className={s.addIcon} type='dashed' shape='circle'><UploadOutlined /><div>Icon</div></Button>
            </Upload> :
            <Flex
              className={s.catIcon}
              align='center'
              justify='center'
              title='Clear Icon'
              style={{ color: item.color }}
              onClick={() => onChange(i, 'icon', null)}
              dangerouslySetInnerHTML={{ __html: item.icon }}
            />
          }
          <Input
            placeholder='Label'
            defaultValue={item.label}
            className={s.catName}
            onBlur={e => onChange(i, 'label', e.target.value)}
          />
          <ColorPicker
            defaultValue={item.color}
            onChangeComplete={(color) => onChange(i, 'color', `#${color.toHex()}`)}
            className={s.catColor}
            showText
          />
          <Button className={s.deleteCat} icon={<DeleteOutlined />} onClick={() => deleteCategory(item.value)} danger />
          <Space.Compact style={{ transform: 'rotate(90deg)' }}>
            <Button
              size='small'
              icon={<ArrowLeftOutlined />} style={i === 0 ? { opacity: 0, pointerEvents: 'none' } : undefined}
              onClick={() => reorder(i, i - 1)}
            />
            <Button
              size='small'
              icon={<ArrowRightOutlined />}
              style={i === items.length - 1 ? { opacity: 0, pointerEvents: 'none' } : undefined}
              onClick={() => reorder(i, i + 1)}
            />
          </Space.Compact>
        </Flex>
      ))}
    </Flex>
  )
}