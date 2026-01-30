import { useEffect } from 'react'
import { Modal } from 'antd'
import SectionForm from './SectionForm'

const SectionModal = ({
  open,
  section,
  formData,
  setFormData,
  onOk,
  onCancel,
  categories = [],
  sections = [],
  onCategoriesChange
}) => {
  // Обработчик нажатия Enter для сохранения
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      // Проверяем, что нажата клавиша Enter и не в поле ввода текста
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        // Проверяем, что фокус не в поле ввода (Input, InputNumber и т.д.)
        const isInput = e.target.tagName === 'INPUT' && e.target.type !== 'button' && e.target.type !== 'submit'
        if (!isInput) {
          e.preventDefault()
          e.stopPropagation()
          onOk()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOk])

  return (
    <Modal
      title="Настройки секции"
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText="Сохранить"
      cancelText="Отмена"
      width={600}
      style={{ top: 20 }}
      maskClosable={false}
    >
      {section && (
        <SectionForm
          section={section}
          formData={formData}
          setFormData={setFormData}
          categories={categories}
          sections={sections}
          onCategoriesChange={onCategoriesChange}
        />
      )}
    </Modal>
  )
}

export default SectionModal
