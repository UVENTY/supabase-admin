import { Upload, Typography } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { toBase64 } from '../../utils/utils'
import './styles.css'

export default function InputImage({
  value,
  onChange = () => {}
}) {
  const handleChangeFile = e => toBase64(e.file).then(base64 => onChange(base64))
  return (
    <>
      <Upload
        accept='image/*'
        beforeUpload={() => false}
        listType='picture'
        onChange={handleChangeFile}
        showUploadList={false}
        multiple={false}
      >
        <div className='input-image__button'>
          {!!value ?
            <img src={value} alt="avatar" style={{ width: '100%' }} /> :
            <div>
              <PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div>
            </div>
          }
        </div>
      </Upload>
      {!!value && <Typography.Link
        className='input-image__remove'
        onClick={() => onChange('')}
      >
        <DeleteOutlined /> Remove image
      </Typography.Link>}
    </>
  )
}