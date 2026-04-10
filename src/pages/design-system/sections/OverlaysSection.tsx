import { useState } from 'react'
import { Modal, Drawer, Button, Input, Popconfirm, Space } from 'antd'
import { ConfirmModal, FormField } from '@/components/ui-kit'

export function OverlaysSection() {
  const [modalOpen, setModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <section id="overlays">
      <h2 className="text-xl font-semibold text-foreground mb-6">Overlays</h2>

      <div className="space-y-6">
        <Space wrap>
          <Button onClick={() => setModalOpen(true)}>Standard Modal</Button>
          <Button onClick={() => setFormModalOpen(true)}>Form Modal</Button>
          <Button onClick={() => setDrawerOpen(true)}>Drawer</Button>
          <Button danger onClick={() => setConfirmOpen(true)}>Confirm Delete</Button>
          <Popconfirm
            title="Are you sure?"
            description="This action cannot be undone."
            onConfirm={() => {}}
            okText="Yes"
            cancelText="No"
          >
            <Button>Popconfirm</Button>
          </Popconfirm>
        </Space>

        {/* Standard Modal */}
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          title="Standard Modal"
          onOk={() => setModalOpen(false)}
        >
          <p className="text-sm text-muted-foreground">
            This is a standard modal with OK/Cancel buttons.
          </p>
        </Modal>

        {/* Form Modal */}
        <Modal
          open={formModalOpen}
          onCancel={() => setFormModalOpen(false)}
          title="Edit Campaign"
          okText="Save"
          onOk={() => setFormModalOpen(false)}
          width={480}
        >
          <div className="space-y-4 py-2">
            <FormField label="Campaign Name" required>
              <Input placeholder="Enter campaign name" />
            </FormField>
            <FormField label="Description">
              <Input.TextArea rows={3} placeholder="Optional description" />
            </FormField>
          </div>
        </Modal>

        {/* Drawer */}
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Settings Panel"
          size="large"
        >
          <div className="space-y-4">
            <FormField label="API Key">
              <Input placeholder="sk-..." />
            </FormField>
            <FormField label="Webhook URL">
              <Input placeholder="https://..." />
            </FormField>
          </div>
        </Drawer>

        {/* Confirm Modal (from ui-kit) */}
        <ConfirmModal
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="Delete Campaign"
          description="This will permanently delete the campaign and all associated data. This action cannot be undone."
          confirmText="Delete"
          danger
        />
      </div>
    </section>
  )
}
