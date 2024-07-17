'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, Trash2, Construction as ConstructionIcon, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface TableData {
  id: string;
  rows: string[][];
  columns: {id: string, name: string}[];
  expandedRows: boolean[];
}

interface Section {
  id: string;
  header: string;
  table: TableData;
}

interface Props {
  type: string;
  styling: string;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;

}

const Construction = ({ type, styling, sections, setSections }: Props) => {
  const toggleRowExpansion = (sectionId: string, rowIndex: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newExpandedRows = [...section.table.expandedRows];
        newExpandedRows[rowIndex] = !newExpandedRows[rowIndex];
        return {
          ...section,
          table: {
            ...section.table,
            expandedRows: newExpandedRows
          }
        };
      }
      return section;
    }));
  };

  const addSection = () => {
    // const newSection: Section = {
    //   id: Date.now().toString(),
    //   header: 'New Section',
    //   table: {
    //     id: Date.now().toString(),
    //     rows: [['']],
    //     columns: ['Column 1'],
    //     expandedRows: [false]
    //   }
    // };
    // setSections([...sections, newSection]);
  };

  const printSection = (sectionId: string) => {
    const sectionToPrint = sections.find(section => section.id === sectionId);

    if (!sectionToPrint) {
      console.error(`Section with id ${sectionId} not found`);
      return;
    }

    // Create HTML content for the section
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${sectionToPrint.header}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${sectionToPrint.header}</h1>
        <table>
          <thead>
            <tr>
              ${sectionToPrint.table.columns.map(col => `<th>${col}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sectionToPrint.table.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Open the HTML content in a new tab and print it
    openHtmlInNewTab(htmlContent);
  }

  const openHtmlInNewTab = (htmlContent: string) => {
    const newWindow = window.open('');
    newWindow!.document.write(htmlContent);
    newWindow!.print();
    newWindow!.close();
  };

  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const updateHeader = (sectionId: string, newHeader: string) => {
    setSections(sections.map(section =>
      section.id === sectionId ? { ...section, header: newHeader } : section
    ));
  };

  const addRow = (sectionId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newRow = Array(section.table.rows[0].length).fill('');
        return {
          ...section,
          table: {
            ...section.table,
            rows: [...section.table.rows, newRow]
          }
        };
      }
      return section;
    }));
  };

  const deleteRow = (sectionId: string, rowIndex: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newRows = section.table.rows.filter((_, index) => index !== rowIndex);
        return {
          ...section,
          table: {
            ...section.table,
            rows: newRows
          }
        };
      }
      return section;
    }));
  };

  const addColumn = (sectionId: string) => {
    // setSections(sections.map(section => {
    //   if (section.id === sectionId && section.table.rows[0].length < 3) {
    //     const newRows = section.table.rows.map(row => [...row, '']);
    //     return {
    //       ...section,
    //       table: {
    //         ...section.table,
    //         rows: newRows,
    //         columns: [...section.table.columns, 'New Column']
    //       }
    //     };
    //   }
    //   return section;
    // }));
  };

  const deleteColumn = (sectionId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId && section.table.rows[0].length > 1) {
        const newRows = section.table.rows.map(row => row.slice(0, -1));
        const newCols = section.table.columns.slice(0, -1);
        return {
          ...section,
          table: {
            ...section.table,
            rows: newRows,
            columns: newCols
          }
        };
      }
      return section;
    }));
  };

  const updateColumn = (sectionId: string, rowIndex: number, value: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newCol = [...section.table.columns];
        newCol[rowIndex]['name'] = value;
        return {
          ...section,
          table: {
            ...section.table,
            columns: newCol
          }
        }
      } else {
        return section;
      }
    }))
  }

  const updateCell = (sectionId: string, rowIndex: number, colIndex: number, value: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newRows = section.table.rows.map((row, rIndex) =>
          rIndex === rowIndex
            ? row.map((cell, cIndex) => (cIndex === colIndex ? value : cell))
            : row
        );
        return {
          ...section,
          table: {
            ...section.table,
            rows: newRows
          }
        };
      }
      return section;
    }));
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="border rounded-lg overflow-hidden">
          <div className={`flex justify-between items-center ${styling} p-2`}>
            <Input
              value={section.header}
              onChange={(e) => updateHeader(section.id, e.target.value)}
              className="text-lg font-semibold bg-transparent border-none"
            />
            <Button variant="ghost" size="sm" onClick={() => deleteSection(section.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => printSection(section.id)}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {/* {section.table.rows[0].map((_, colIndex) => (
                  <TableHead key={colIndex} className="py-2">Column {colIndex + 1}</TableHead>
                ))} */}
                {section.table.columns.map((col, colIndex) => (
                  <TableHead key={colIndex} className="py-2">
                    <Input
                      value={col['name']}
                      onChange={(e) => updateColumn(section.id, colIndex, e.target.value)}
                      className="border-none h-8"
                    />

                  </TableHead>
                ))}
                <TableHead className="w-20 py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            {/* <TableBody>
              {section.table.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <TableCell key={colIndex} className="p-0">
                      <Input
                        value={cell}
                        onChange={(e) => updateCell(section.id, rowIndex, colIndex, e.target.value)}
                        className="border-none h-8"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-0">
                    <Button variant="ghost" size="sm" onClick={() => deleteRow(section.id, rowIndex)}>
                      <Minus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody> */}
            <TableBody>
              {section.table.rows.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <TableRow className="hover:bg-gray-50 transition-colors">
                    {row.map((cell, colIndex) => (
                      <TableCell key={colIndex} className="p-2">
                        <Input
                          value={cell}
                          onChange={(e) => updateCell(section.id, rowIndex, colIndex, e.target.value)}
                          className="border-none bg-transparent w-full focus:ring-2 focus:ring-blue-200 rounded px-2 py-1"
                        />
                      </TableCell>
                    ))}
                    <TableCell className="p-2">
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRow(section.id, rowIndex)}
                          className="hover:bg-red-100 transition-colors"
                          disabled={section.table.rows.length <= 1}
                        >
                          <Minus className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(section.id, rowIndex)}
                          className="hover:bg-blue-100 transition-colors"
                        >
                          {section.table.expandedRows[rowIndex] ? (
                            <ChevronUp className="h-4 w-4 text-blue-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-blue-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {section.table.expandedRows[rowIndex] && (
                    <TableRow>
                      <TableCell colSpan={row.length + 1} className="bg-gray-100 p-0">
                        <div className="p-4 space-y-2">
                          {row.map((cell, colIndex) => (
                            <div key={colIndex} className="flex">
                              <span className="font-semibold min-w-[100px] text-gray-600">
                                {section.table.columns[colIndex]['name']}:
                              </span>
                              <span className="ml-2 text-gray-800 break-words">{cell}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end space-x-1 p-2 bg-gray-50">
            <Button size="sm" variant="outline" onClick={() => addRow(section.id)}>
              <Plus className="h-3 w-3 mr-1" /> Row
            </Button>
            <Button size="sm" variant="outline" onClick={() => addColumn(section.id)} disabled={section.table.rows[0].length >= 3}>
              <Plus className="h-3 w-3 mr-1" /> Column
            </Button>
            <Button size="sm" variant="outline" onClick={() => deleteColumn(section.id)} disabled={section.table.rows[0].length <= 1}>
              <Minus className="h-3 w-3 mr-1" /> Column
            </Button>
          </div>
        </div>
      ))}
      <Button onClick={addSection} className="mt-4">
        <Plus className="h-4 w-4 mr-2" /> Add New Section
      </Button>

      {type === 'construction' &&
        <Link href='/equipment'>
          <Button className="mt-4 ml-4" variant="outline">
            <ConstructionIcon className="h-4 w-4 mr-2" /> Equipment List
          </Button>
        </Link>
          }
    </div>
  );
};

export default Construction;