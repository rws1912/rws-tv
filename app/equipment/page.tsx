"use client"

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Item {
    id: string;
    label: string;
    type: string;
    model: string;
    description: string;
    location: string;
}

const InventoryTable: React.FC = () => {
    const [items, setItems] = useState<Item[]>([
        { id: '1', label: 'Item 1', type: 'Type A', model: 'Model X', description: 'Description for Item 1', location: 'Location A' },
        { id: '2', label: 'Item 2', type: 'Type B', model: 'Model Y', description: 'Description for Item 2', location: 'Location B' },
    ]);

    const [editingCell, setEditingCell] = useState<{ id: string, field: keyof Item } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingCell]);

    const updateItem = (id: string, field: keyof Item, value: string) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const deleteRow = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const insertRowBelow = (id: string) => {
        const index = items.findIndex(item => item.id === id);
        const newItem: Item = {
            id: Date.now().toString(),
            label: '',
            type: '',
            model: '',
            description: '',
            location: '',
        };
        setItems([...items.slice(0, index + 1), newItem, ...items.slice(index + 1)]);
    };

    const handleCellClick = (id: string, field: keyof Item) => {
        setEditingCell({ id, field });
    };

    const handleCellBlur = () => {
        setEditingCell(null);
    };

    const renderCell = (item: Item, field: keyof Item) => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;

        return (
            <div className="min-h-[2rem] w-full relative">
                {isEditing ? (
                    <Input
                        ref={inputRef}
                        value={item[field]}
                        onChange={(e) => updateItem(item.id, field, e.target.value)}
                        onBlur={handleCellBlur}
                        className="absolute inset-0 w-full h-full p-0 border-none focus:ring-2 focus:ring-blue-500"
                    />
                ) : (
                    <div
                        className="w-full h-full cursor-pointer p-2 absolute inset-0 overflow-hidden text-ellipsis whitespace-nowrap"
                        onClick={() => handleCellClick(item.id, field)}
                    >
                        {item[field] || <span className="text-gray-400">Click to edit</span>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen w-screen overflow-auto p-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/12">Label</TableHead>
                        <TableHead className="w-1/6">Type</TableHead>
                        <TableHead className="w-1/12">Model</TableHead>
                        <TableHead className="w-6/12">Description</TableHead>
                        <TableHead className="w-1/6">Location</TableHead>
                        <TableHead className="max-w-fit text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="p-0">{renderCell(item, 'label')}</TableCell>
                            <TableCell className="p-0">{renderCell(item, 'type')}</TableCell>
                            <TableCell className="p-0">{renderCell(item, 'model')}</TableCell>
                            <TableCell className="p-0">{renderCell(item, 'description')}</TableCell>
                            <TableCell className="p-0">{renderCell(item, 'location')}</TableCell>
                            <TableCell className='max-w-fit text-right'>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => deleteRow(item.id)}>
                                            <Trash className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => insertRowBelow(item.id)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Insert Below
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default InventoryTable;