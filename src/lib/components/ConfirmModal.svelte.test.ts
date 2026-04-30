import { render, screen, fireEvent } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConfirmModal from './ConfirmModal.svelte';

beforeEach(() => {
	HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
		this.setAttribute('open', '');
	});
	HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
		this.removeAttribute('open');
	});
});

const baseProps = {
	open: false,
	title: 'Delete this?',
	description: 'This cannot be undone.',
	onconfirm: vi.fn(),
	oncancel: vi.fn()
};

describe('ConfirmModal', () => {
	it('does not call showModal when open=false', () => {
		render(ConfirmModal, { ...baseProps, open: false });
		expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
	});

	it('calls showModal when open=true', () => {
		render(ConfirmModal, { ...baseProps, open: true });
		expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
	});

	it('renders title text', () => {
		render(ConfirmModal, { ...baseProps, open: true });
		expect(screen.getByText('Delete this?')).not.toBeNull();
	});

	it('renders description text', () => {
		render(ConfirmModal, { ...baseProps, open: true });
		expect(screen.getByText('This cannot be undone.')).not.toBeNull();
	});

	it('renders custom confirmLabel on the confirm button', () => {
		render(ConfirmModal, { ...baseProps, open: true, confirmLabel: 'Delete' });
		expect(screen.getByRole('button', { name: 'Delete' })).not.toBeNull();
	});

	it('Cancel button is in the DOM and is the dismiss path', () => {
		render(ConfirmModal, { ...baseProps, open: true });
		expect(screen.getByRole('button', { name: 'Cancel' })).not.toBeNull();
	});

	it('clicking Cancel calls oncancel', async () => {
		const oncancel = vi.fn();
		const user = userEvent.setup();
		render(ConfirmModal, { ...baseProps, open: true, oncancel });
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		expect(oncancel).toHaveBeenCalledTimes(1);
	});

	it('clicking the confirm button calls onconfirm', async () => {
		const onconfirm = vi.fn();
		const user = userEvent.setup();
		render(ConfirmModal, { ...baseProps, open: true, onconfirm, confirmLabel: 'Delete' });
		await user.click(screen.getByRole('button', { name: 'Delete' }));
		expect(onconfirm).toHaveBeenCalledTimes(1);
	});

	it('close event on dialog calls oncancel (Esc path)', () => {
		const oncancel = vi.fn();
		render(ConfirmModal, { ...baseProps, open: true, oncancel });
		const dialog = document.querySelector('dialog')!;
		fireEvent(dialog, new Event('close'));
		expect(oncancel).toHaveBeenCalledTimes(1);
	});
});
