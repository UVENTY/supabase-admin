// Компонент для замены Form.Item
const FormField = ({ label, children }) => (
  <div>
    <div style={{ marginBottom: '8px', fontWeight: 500 }}>{label}</div>
    {children}
  </div>
)

export default FormField
