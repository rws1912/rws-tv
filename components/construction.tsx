'use client';

import React, { useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, Trash2, Construction as ConstructionIcon, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import print from '@/lib/print';

interface TableData {
  id: number;
  rows: { id: number, categoryDataId: number, value: string }[][];
  columns: { id: string, name: string }[];
  expandedRows: boolean[];
}

interface Section {
  id: number;
  header: string;
  table: TableData;
}

interface Props {
  type: string;
  styling: string;
  sections: Section[];
  setSections: React.Dispatch<React.SetStateAction<Section[]>>;
  isLocalUpdateRef: React.MutableRefObject<boolean>;
  isMobile: boolean

}

function debounce<F extends (...args: any[]) => any>(func: F, delay: number): (...args: Parameters<F>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<F>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

const Construction = ({ type, styling, sections, setSections, isLocalUpdateRef, isMobile }: Props) => {
  const toggleRowExpansion = (sectionId: number, rowIndex: number) => {
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


  // const addSection = () => {
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
  // };

  const addSection = async () => {
    try {
      // Step 1: Create a new category
      const { data: newCategory, error: categoryError } = await supabase
        .from('Categories')
        .insert([
          { header: 'New Section', type: type }
        ])
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Step 2: Create a column definition for the new category
      const { data: newColumn, error: columnError } = await supabase
        .from('ColumnDefinitions')
        .insert([
          {
            category_id: newCategory.id,
            column_name: 'Column 1',
            column_order: 1
          }
        ])
        .select()
        .single();

      if (columnError) throw columnError;

      // Step 3: Create a new row for the category
      const { data: newRow, error: rowError } = await supabase
        .from('CategoryData')
        .insert([
          {
            category_id: newCategory.id,
            row_number: 1
          }
        ])
        .select()
        .single();

      if (rowError) throw rowError;

      // Step 4: Add a value for the new row and column
      const { error: valueError } = await supabase
        .from('CategoryDataValues')
        .insert([
          {
            category_data_id: newRow.id,
            column_definition_id: newColumn.id,
            value: ''
          }
        ]);

      if (valueError) throw valueError;


    } catch (error) {
      console.error('Error adding new section:', error);
      // Handle the error appropriately (e.g., show an error message to the user)
    }
  };

  const printWholeSection = () => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>All Sections</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .section-container {
          page-break-inside: avoid;
          margin-bottom: 30px;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
          margin-top: 30px;
          margin-bottom: 10px;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          box-shadow: 0 2px 3px rgba(0,0,0,0.1);
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
          color: #2c3e50;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        @media print {
          body {
            padding: 0;
            max-width: none;
          }
          .section-container {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      ${sections.map(section => `
        <div class="section-container">
          <h1>${section.header}</h1>
          <table>
            <thead>
              <tr>
                ${section.table.columns.map(col => `<th>${col.name}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${section.table.rows.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell.value}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </body>
    </html>
  `;


    // Open the HTML content in a new tab and print it
    print(htmlContent);
  }

  const printSection = (sectionId: number) => {
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
              ${sectionToPrint.table.columns.map(col => `<th>${col.name.toUpperCase()}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sectionToPrint.table.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell.value.toUpperCase()}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Open the HTML content in a new tab and print it
    print(htmlContent);
  }



  const deleteSection = async (sectionId: number) => {
    try {
      isLocalUpdateRef.current = true;

      setSections(prevSections => prevSections.filter(section => section.id !== sectionId));

      // Delete the section from the Categories table
      const { error } = await supabase
        .from('Categories')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      // If deletion is successful, update the local state

      console.log(`Section ${sectionId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting section:', error);
      // Handle the error appropriately (e.g., show an error message to the user)
    }
  };

  // Debounced function to update the database
  const debouncedUpdateHeaderInDatabase = useDebounce(async (sectionId: number, newHeader: string) => {
    try {
      const { error } = await supabase
        .from('Categories')
        .update({ header: newHeader })
        .eq('id', sectionId);

      if (error) throw error;

      console.log(`Header for section ${sectionId} updated successfully`);
    } catch (error) {
      console.error('Error updating header:', error);
      // Handle the error appropriately (e.g., show an error message to the user)
    }
  }, 500); // 500ms delay

  const updateHeader = useCallback((sectionId: number, newHeader: string) => {
    isLocalUpdateRef.current = true;

    // Immediately update local state for responsive UI
    setSections(prevSections => prevSections.map(section =>
      section.id === sectionId ? { ...section, header: newHeader } : section
    ));

    // Trigger the debounced database update
    debouncedUpdateHeaderInDatabase(sectionId, newHeader);
  }, [debouncedUpdateHeaderInDatabase]);

  // const addRow = (sectionId: string) => {
  //   setSections(sections.map(section => {
  //     if (section.id === sectionId) {
  //       const newRow = Array(section.table.rows[0].length).fill('');
  //       return {
  //         ...section,
  //         table: {
  //           ...section.table,
  //           rows: [...section.table.rows, newRow]
  //         }
  //       };
  //     }
  //     return section;
  //   }));
  // };
  const addRow = async (sectionId: number) => {
    try {
      isLocalUpdateRef.current = true;

      // Find the section in the current state
      const section = sections.find(s => s.id === sectionId);
      if (!section) {
        console.error('Section not found');
        return;
      }

      // Get the number of existing rows
      const newRowNumber = section.table.rows.length + 1;

      // Insert new row into CategoryData
      const { data: newCategoryData, error: categoryDataError } = await supabase
        .from('CategoryData')
        .insert({ category_id: sectionId, row_number: newRowNumber })
        .select()
        .single();

      if (categoryDataError) throw categoryDataError;

      // Insert empty values for each column
      const columnInserts = section.table.columns.map((_, index) => ({
        category_data_id: newCategoryData.id,
        column_definition_id: section.table.columns[index].id,
        value: ''
      }));

      const { data: newValues, error: valuesError } = await supabase
        .from('CategoryDataValues')
        .insert(columnInserts)
        .select();

      if (valuesError) throw valuesError;

      // Update the local state
      setSections(sections.map(s => {
        if (s.id === sectionId) {
          const newRow = newValues.map((value) => ({ id: value.id, categoryDataId: value.category_data_id, value: '' }));
          return {
            ...s,
            table: {
              ...s.table,
              rows: [...s.table.rows, newRow],
              expandedRows: [...s.table.expandedRows, false] // Add a new expandedRow state
            }
          };
        }
        return s;
      }));

      console.log('New row added successfully');
    } catch (error) {
      console.error('Error adding new row:', error);
    }
  };

  const deleteRow = async (rowId: number, sectionId: number, rowIndex: number) => {
    try {
      isLocalUpdateRef.current = true;

      const { error } = await supabase
        .from('CategoryData')
        .delete()
        .eq('id', rowId);

      if (error) {
        throw error;
      }

      console.log(`Row ${rowId} deleted successfully`);

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

    } catch (error) {
      console.error('Error deleting row:', error);
      // Handle the error appropriately (e.g., show an error message to the user)
    }
  };

  // const addColumn = (sectionId: string) => {
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
  // };
  const addColumn = async (sectionId: number) => {
    try {
      isLocalUpdateRef.current = true;

      const section = sections.find(s => s.id === sectionId);
      if (!section) {
        console.error('Section not found');
        return;
      }

      // Add new column definition
      const { data: newColumn, error: columnError } = await supabase
        .from('ColumnDefinitions')
        .insert({
          category_id: sectionId,
          column_name: 'New Column',
          column_order: section.table.columns.length + 1
        })
        .select()
        .single();

      if (columnError) throw columnError;

      // Add empty values for each existing row
      const rowInserts = section.table.rows.map(row => ({
        category_data_id: row[0].categoryDataId, // Assuming the first column's id is the row id
        column_definition_id: newColumn.id,
        value: ''
      }));

      const { data: newValues, error: valuesError } = await supabase
        .from('CategoryDataValues')
        .insert(rowInserts)
        .select();

      if (valuesError) throw valuesError;

      // Update local state
      // setSections(prevSections => prevSections.map(s => {
      //   if (s.id === sectionId) {
      //     const newRows = s.table.rows.map(row => [...row, { id: row[0].id, value: '', categoryDataId: row[0].categoryDataId }]);
      //     return {
      //       ...s,
      //       table: {
      //         ...s.table,
      //         rows: newRows,
      //         columns: [...s.table.columns, { id: newColumn.id, name: 'New Column' }]
      //       }
      //     };
      //   }
      //   return s;
      // }));

      console.log('New column added successfully');
    } catch (error) {
      console.error('Error adding new column:', error);
    }
  };

  // useEffect(() => {
  //   console.log("Sections is", sections);
  // }, [sections])

  // const deleteColumn = (sectionId: string) => {
  // setSections(sections.map(section => {
  //   if (section.id === sectionId && section.table.rows[0].length > 1) {
  //     const newRows = section.table.rows.map(row => row.slice(0, -1));
  //     const newCols = section.table.columns.slice(0, -1);
  //     return {
  //       ...section,
  //       table: {
  //         ...section.table,
  //         rows: newRows,
  //         columns: newCols
  //       }
  //     };
  //   }
  //   return section;
  // }));
  // };
  const deleteColumn = async (sectionId: number) => {
    try {
      isLocalUpdateRef.current = true;

      const section = sections.find(s => s.id === sectionId);
      if (!section || section.table.columns.length <= 1) {
        console.error('Section not found or only one column remains');
        return;
      }

      const lastColumn = section.table.columns[section.table.columns.length - 1];

      // Delete the column definition
      const { error: columnDeleteError } = await supabase
        .from('ColumnDefinitions')
        .delete()
        .eq('id', lastColumn.id);

      if (columnDeleteError) throw columnDeleteError;

      // Update local state
      setSections(prevSections => prevSections.map(s => {
        if (s.id === sectionId) {
          const newRows = s.table.rows.map(row => row.slice(0, -1));
          const newCols = s.table.columns.slice(0, -1);
          return {
            ...s,
            table: {
              ...s.table,
              rows: newRows,
              columns: newCols
            }
          };
        }
        return s;
      }));

      console.log('Last column deleted successfully');
    } catch (error) {
      console.error('Error deleting last column:', error);
    }
  };

  const debouncedUpdateColumnInDB = useDebounce(async (colId: string, value: string) => {
    try {
      const { data, error } = await supabase
        .from('ColumnDefinitions')
        .update({ column_name: value })
        .eq('id', colId)
        .select();

      if (error) throw error;
      console.log('Column updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error updating column:', error);
      throw error;
    }
  }, 500)

  const updateColumn = useCallback((colId: string, sectionId: number, rowIndex: number, value: string) => {
    isLocalUpdateRef.current = true;

    setSections(prevSections => prevSections.map(section => {
      if (section.id === sectionId) {
        const newCol = section.table.columns.map((col, index) =>
          index === rowIndex ? { ...col, name: value } : col
        );
        return {
          ...section,
          table: {
            ...section.table,
            columns: newCol
          }
        };
      }
      return section;
    }));

    // Call the debounced function to update the database
    debouncedUpdateColumnInDB(colId, value);
  }, [debouncedUpdateColumnInDB]);

  const debouncedUpdateCell = useDebounce(async (cellId: number, value: string) => {
    try {
      const { data, error } = await supabase
        .from('CategoryDataValues')
        .update({ value: value })
        .eq('id', cellId)
        .select();

      if (error) throw error;

      console.log('Cell updated successfully:', data);
      return data;
    } catch (error) {
      console.log("cellId", cellId, "value", value)
      console.error('Error updating cell:', error);
      throw error;
    }
  }, 500)

  const updateCell = useCallback((sectionId: number, colIndex: number, rowIndex: number, cellId: number, value: string) => {
    isLocalUpdateRef.current = true;

    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newRows = section.table.rows.map((row, rIndex) =>
          rIndex === rowIndex
            ? row.map((cell, cIndex) => (cIndex === colIndex ? { ...cell, value: value, } : cell))
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

    debouncedUpdateCell(cellId, value);
  }, [debouncedUpdateCell])

  return (
    <>
      <div className='mb-2 mt-2 flex w-full justify-between'>
        <div>
          <Button onClick={addSection}>
            <Plus className="h-4 w-4 mr-2" /> Add New Section
          </Button>

          <Button onClick={printWholeSection} variant='outline' className="ml-4 mr-4">
            <Printer className="h-4 w-4 mr-2" /> Print {type}
          </Button>

          {type === 'construction' &&
            <Link href='/equipment'>
              <Button className="mt-2" variant={'secondary'}>
                <ConstructionIcon className="h-4 w-4 mr-2" /> Equipment List
              </Button>
            </Link>
          }
        </div>
        {type !== 'construction' &&
          <Link href='/projects'>
            <Button variant='outline' className="ml-4 mr-4">
              Projects
            </Button>
          </Link>
        }

      </div>
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
                  {section.table.columns.map((col, colIndex) => (
                    <TableHead key={colIndex} className="py-2">
                      <Input
                        value={col['name']}
                        onChange={(e) => updateColumn(col.id, section.id, colIndex, e.target.value)}
                        className="border-none h-8"
                      />

                    </TableHead>
                  ))}
                  <TableHead className="w-20 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.table.rows.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    <TableRow className="hover:bg-gray-50 transition-colors">
                      {row.sort((a, b) => a.id - b.id).map((cell, colIndex) => (
                        <TableCell key={colIndex} className="p-2">
                          <Input
                            value={cell.value ? cell.value.toUpperCase() : ''}
                            onChange={(e) => updateCell(section.id, colIndex, rowIndex, cell.id, e.target.value)}
                            className="border-none bg-transparent w-full focus:ring-2 focus:ring-blue-200 rounded px-2 py-1"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="p-2">
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRow(row[0].categoryDataId, section.id, rowIndex)}
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
                                <span className="ml-2 text-gray-800 break-words">{cell.value ? cell.value.toUpperCase() : ''}</span>
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
            {!isMobile &&
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
              </div>}
          </div>
        ))}


      </div>
    </>
  );
};

export default Construction;