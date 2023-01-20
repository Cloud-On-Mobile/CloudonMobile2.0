import { shallowMount, mount } from '@vue/test-utils'
import BaseButton from '@/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('renders with active theme when passed as prop', () => {
    const theme = 'active'
    const wrapper = shallowMount(BaseButton, { props: { theme }})
    expect(wrapper.attributes('class')).toBe('base-button base-button--active')
  })

  it('renders with inactive theme when passed as prop', () => {
    const theme = 'inactive'
    const wrapper = shallowMount(BaseButton, { props: { theme }})
    expect(wrapper.attributes('class')).toBe('base-button base-button--inactive')
  })

  it('renders with new-file theme when passed as prop', () => {
    const theme = 'new-file'
    const wrapper = shallowMount(BaseButton, { props: { theme }})
    expect(wrapper.attributes('class')).toBe('base-button base-button--new-file')
  })
})
