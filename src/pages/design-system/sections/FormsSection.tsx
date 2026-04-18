import { useState } from 'react'
import {
  AntdSelect,
  Checkbox,
  DatePicker,
  FormField,
  Input,
  InputNumber,
  Radio,
  Switch,
} from '@/components/ui-kit'

export function FormsSection() {
  const [switchVal, setSwitchVal] = useState(true)

  return (
    <section id="forms">
      <h2 className="text-xl font-semibold text-foreground mb-6">Forms</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Use <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{'<FormField>'}</code> for
        consistent label + input + error layout. Import from <code className="text-xs bg-muted px-1.5 py-0.5 rounded">@/components/ui-kit</code>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <FormField label="Name" htmlFor="demo-name" required>
          <Input id="demo-name" placeholder="Enter name" />
        </FormField>

        <FormField label="Email" htmlFor="demo-email" error="Invalid email address">
          <Input id="demo-email" placeholder="user@example.com" status="error" />
        </FormField>

        <FormField label="Traffic Source" help="Select the traffic source for this campaign">
          <AntdSelect
            placeholder="Choose source"
            options={[
              { label: 'Facebook', value: 'fb' },
              { label: 'Google', value: 'google' },
              { label: 'TikTok', value: 'tiktok' },
            ]}
            className="w-full"
          />
        </FormField>

        <FormField label="Budget" htmlFor="demo-budget">
          <InputNumber
            id="demo-budget"
            placeholder="0.00"
            prefix="$"
            className="w-full"
          />
        </FormField>

        <FormField label="Description">
          <Input.TextArea placeholder="Optional description..." rows={3} />
        </FormField>

        <FormField label="Date">
          <DatePicker className="w-full" />
        </FormField>

        <FormField label="Disabled Input">
          <Input value="Read-only value" disabled />
        </FormField>

        <div className="space-y-4">
          <FormField label="Toggle">
            <div className="pt-1">
              <Switch checked={switchVal} onChange={setSwitchVal} />
              <span className="ml-2 text-sm text-muted-foreground">
                {switchVal ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </FormField>

          <FormField label="Checkbox">
            <div className="pt-1">
              <Checkbox>Accept terms and conditions</Checkbox>
            </div>
          </FormField>

          <FormField label="Radio Group">
            <Radio.Group defaultValue="a" className="pt-1">
              <Radio value="a">Option A</Radio>
              <Radio value="b">Option B</Radio>
              <Radio value="c">Option C</Radio>
            </Radio.Group>
          </FormField>
        </div>
      </div>
    </section>
  )
}
