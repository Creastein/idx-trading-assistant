import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StockSearch } from '../StockSearch'

// Mock the stock list
vi.mock('@/lib/stockList', () => ({
    POPULAR_IDX_STOCKS: [
        { symbol: 'BBCA', name: 'Bank Central Asia', sector: 'Finance' },
        { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Technology' },
    ]
}))

describe('StockSearch Component', () => {

    it('should render input field', () => {
        render(<StockSearch onSelect={() => { }} />)
        const input = screen.getByPlaceholderText(/search ticker/i)
        expect(input).toBeInTheDocument()
    })

    it('should show suggestions when typing', () => {
        render(<StockSearch onSelect={() => { }} />)
        const input = screen.getByPlaceholderText(/search ticker/i)

        fireEvent.change(input, { target: { value: 'GO' } })

        // Should find GOTO
        expect(screen.getByText('GOTO')).toBeInTheDocument()
        // Should NOT find BBCA
        expect(screen.queryByText('BBCA')).not.toBeInTheDocument()
    })

    it('should call onSelect when a suggestion is clicked', () => {
        const handleSelect = vi.fn()
        render(<StockSearch onSelect={handleSelect} />)

        const input = screen.getByPlaceholderText(/search ticker/i)
        fireEvent.change(input, { target: { value: 'BBC' } }) // Type enough to find BBCA

        const suggestion = screen.getByText('BBCA')
        fireEvent.click(suggestion)

        expect(handleSelect).toHaveBeenCalledWith('BBCA')
    })
})
