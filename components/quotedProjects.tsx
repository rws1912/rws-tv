"use client"

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { PlusCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient'
import { ChevronDown, ChevronUp } from 'lucide-react';

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


interface Project {
  id: number;
  quotationRef: string;
  name: string;
  location: string;
  closingDate: Date;
  closingTime: string;
  
}

interface Props {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  isLocalUpdateRef: React.MutableRefObject<boolean>;
}

const QuotedProjects = ({ projects, setProjects, isLocalUpdateRef }: Props) => {
  const [expandedRows, setExpandedRows] = useState<{ [key: string]: boolean }>({});

  const [sortedProjects, setSortedProjects] = useState<Project[]>([]);
  const toggleRowExpansion = (projectId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  useEffect(() => {
    const sortedProjects = [...projects].sort((a, b) =>
      a.closingDate.getTime() - b.closingDate.getTime()
    );
    setSortedProjects(sortedProjects);
  }, [projects]);

  const addNewRow = async () => {
    const newProject: Omit<Project, 'id'> = {
      quotationRef: '',
      name: '',
      location: '',
      closingDate: new Date(),
      closingTime: '12:00',
    };

    const { data, error } = await supabase
      .from('QuotedProjects')
      .insert(newProject)
      .select();

    if (error) {
      console.error('Error adding new project:', error);
    } else if (data) {
      // setProjects([...projects, data[0] as Project]);
    }
  };

  // const updateProject = (id: number, field: keyof Project, value: any) => {
  //   setProjects(projects.map(project =>
  //     project.id === id ? { ...project, [field]: value } : project
  //   ));
  // };
  const updateDatabaseDebounced = useDebounce((id: number, field: keyof Project, value: any) => {
    supabase
      .from('QuotedProjects')
      .update({ [field]: value })
      .eq('id', id)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error updating project:', error);
        } else {
          // console.log('Project updated successfully:', data);
        }
      });
  }, 500);

  const updateProject = useCallback((id: number, field: keyof Project, value: any) => {
    isLocalUpdateRef.current = true;
    // Immediately update the local state for responsiveness
    setProjects(prevProjects => prevProjects.map(project =>
      project.id === id ? { ...project, [field]: value } : project
    ));

    // Debounce the database update
    updateDatabaseDebounced(id, field, value);
  }, [updateDatabaseDebounced]);


  const getDaysLeft = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getRowColor = (daysLeft: number) => {
    if (daysLeft >= 1 && daysLeft <= 10) return 'bg-red-500';
    if (daysLeft >= 11 && daysLeft <= 20) return 'bg-yellow-400';
    return 'bg-green-400';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quotation Ref</TableHead>
          <TableHead>Name of Project</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Closing Date</TableHead>
          <TableHead>Closing Time</TableHead>
          <TableHead>Days Left</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedProjects.map((project) => {
          const daysLeft = getDaysLeft(project.closingDate);
          const isExpanded = expandedRows[project.id] || false;

          return (
            <React.Fragment key={project.id}>
              <TableRow
                className={`${getRowColor(daysLeft)} hover:bg-opacity-80 transition-colors cursor-pointer`}
                onClick={() => toggleRowExpansion(project.id)}
              >
                <TableCell>
                  <Input
                    value={project.quotationRef}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateProject(project.id, 'quotationRef', e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={project.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateProject(project.id, 'name', e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={project.location}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateProject(project.id, 'location', e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent"
                  />
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-transparent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(project.closingDate, "yyyy-MM-dd")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" onClick={(e) => e.stopPropagation()}>
                      <Calendar
                        mode="single"
                        selected={project.closingDate}
                        onSelect={(date) => date && updateProject(project.id, 'closingDate', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell>
                  <Select
                    value={project.closingTime}
                    onValueChange={(value) => updateProject(project.id, 'closingTime', value)}
                  >
                    <SelectTrigger className="bg-transparent" onClick={(e) => e.stopPropagation()}>
                      <SelectValue>{project.closingTime}</SelectValue>
                    </SelectTrigger>
                    <SelectContent onClick={(e) => e.stopPropagation()}>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                        <SelectItem key={hour} value={`${hour.toString().padStart(2, '0')}:00`}>
                          {`${hour.toString().padStart(2, '0')}:00`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{daysLeft}</TableCell>
                <TableCell>
                  {/* <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(project.id);
                    }}
                    className="hover:bg-blue-100 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-blue-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-blue-500" />
                    )}
                  </Button> */}
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow className="bg-gray-100">
                  <TableCell colSpan={7} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Project Details</h4>
                        <p><strong>Quotation Ref:</strong> {project.quotationRef}</p>
                        <p><strong>Name:</strong> {project.name}</p>
                        <p><strong>Location:</strong> {project.location}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Closing Information</h4>
                        <p><strong>Date:</strong> {format(project.closingDate, "yyyy-MM-dd")}</p>
                        <p><strong>Time:</strong> {project.closingTime}</p>
                        <p><strong>Days Left:</strong> {daysLeft}</p>
                      </div>
                    </div>
                    {/* Add more project details or actions here */}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
        <TableRow>
          <TableCell colSpan={6}>
            <button
              onClick={addNewRow}
              className="w-full text-center text-gray-500 hover:text-gray-700"
            >
              <PlusCircle className="inline-block mr-2" /> Add New Row
            </button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

export default QuotedProjects;