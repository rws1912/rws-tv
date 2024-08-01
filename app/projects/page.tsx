"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft } from 'lucide-react';
import Link from "next/link";



interface RawProjectData {
    Address: string;
    Contractor: string;
    EquipNotPurchased: number;
    FutureInvAmount: string;
    Holdback: string;
    InvAmount: string;
    InvPercent: string;
    JobItemCount: number;
    JobItems: string;
    JobNum: string;
    LastInvDate: string;
    Name: string;
    PaymentAmount: string;
    ProjNum: string;
    ProjSN: string;
    ProjStatus: string;
    ProjValue: string;
    RewardedDate: string;
    SubstCompDate: null | string;
    Summary: null | string;
}

interface ProjectInfo {
    projSN: string,
    jobNum: string,
    name: string,
    contractor: string,
    summary: string,
    status: string,
    projNum: string,
    value: number
}

export default function Projects() {
    const [projects, setProjects] = useState<ProjectInfo[]>([]);
    const [seeProjectGrid, setSeeProjectGrid] = useState<boolean>(false);
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [searchTrigger, setSearchTrigger] = useState<boolean>(false);

    useEffect(() => {
        const getProjectsFromIntranet = async () => {
            const token = process.env.NEXT_PUBLIC_INTRANET_KEY;
            const baseUrl = 'https://rws.ca'
            const url = `${baseUrl}/api/internal/projects/holdbacks/`;

            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const result = await response.json();
                setProjects(result.map((project: RawProjectData) => (
                    {
                        projSN: project.ProjSN,
                        jobNum: project.JobNum,
                        name: project.Name,
                        contractor: project.Contractor,
                        summary: project.Summary,
                        status: project.ProjStatus,
                        projNum: project.ProjNum,

                        value: Number(project.ProjValue)
                    }
                )))

                console.log(result.find((item: any) => item.ProjSN === '61D'));

            } catch (error) {
                console.error(error);
            }
        };


        getProjectsFromIntranet()
    }, []);

    const renderTable = (status: string, header: string) => {
        const filteredProjects = projects.filter(project =>
            project.status === status &&
            (project.projSN.toLowerCase().includes(searchKeyword.toLowerCase()) ||
             project.jobNum.toLowerCase().includes(searchKeyword.toLowerCase()) ||
             project.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
             project.contractor.toLowerCase().includes(searchKeyword.toLowerCase()) 
            )
        );
        if (filteredProjects.length === 0) return null;

        const headerColors: any = {
            'Active': 'bg-blue-200',
            'Completed - HB': 'bg-yellow-200',
            'Completed - Maint HB': 'bg-green-200',
            'Done': 'bg-red-200',
        };

        return (
            <div key={status} className="mb-8">
                <div className="sticky top-16 z-10">
                    <h2 className={`text-2xl font-bold mb-4 ${headerColors[status] || 'bg-gray-200'} p-2 rounded`}>
                        {header}
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proj Ref</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-96">Job Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contractor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredProjects.map((project) => (
                                <tr key={project.projSN}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.projSN}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.jobNum}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-96 truncate">{project.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.contractor}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.summary}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderProjectGrid = () => {
        const filteredProjects = projects.filter(project =>
            (project.projSN.toLowerCase().includes(searchKeyword.toLowerCase()) ||
             project.jobNum.toLowerCase().includes(searchKeyword.toLowerCase()) ||
             project.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
             project.contractor.toLowerCase().includes(searchKeyword.toLowerCase()) 
            )
        );
        if (filteredProjects.length === 0) return null;        
        const sortedProjects = [...filteredProjects].sort((a, b) => a.projSN.localeCompare(b.projSN));

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {sortedProjects.map((project) => (
                    <Card key={project.projSN} className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-center mb-2">
                                <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                                    {project.projSN}
                                </Badge>
                            </div>
                            <CardTitle className="text-2xl font-bold text-primary">{project.name}</CardTitle>
                            <p className="text-xl font-semibold text-secondary-foreground">${project.value.toLocaleString()}</p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="text-sm text-muted-foreground">
                                    <p>Job Number: {project.jobNum}</p>
                                    <p>Project: {project.projNum}</p>
                                </div>
                                <p className="text-sm"><strong>Contractor:</strong> {project.contractor}</p>
                                <p className="text-xs text-muted-foreground"><strong>EQUIP:</strong> {project.summary}</p>
                            </div>
                        </CardContent>
                        {project.status !== 'Active' && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <span className="text-6xl font-bold text-green-500 opacity-80 transform -rotate-45">
                                    FINISHED
                                </span>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        );
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Force a re-render
        setSearchTrigger(prev => !prev);
    }


    return (
        <>
            <div className="sticky top-0 z-20 bg-white w-full py-4 h-16">
                <div className="relative w-full flex items-center justify-between px-4">
                    <Link href="/">
                        <button className="flex items-center min-w-fit">
                            <ChevronLeft className="mr-2" />
                            Go Back
                        </button>
                    </Link>

                    <div className="flex-grow mx-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search projects..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                />
                                {/* <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-4 py-1 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700"
                                >
                                    Search
                                </button> */}
                            </div>
                    </div>

                    <Button variant='default' onClick={() => setSeeProjectGrid(!seeProjectGrid)}>
                        {seeProjectGrid ? 'See Project List' : 'See Project Grid'}
                    </Button>
                </div>
            </div>
            {!seeProjectGrid ?
                <>

                    <div className="container mx-auto p-4">
                        {renderTable('Active', 'A - Current Active Projects')}
                        {renderTable('Completed - HB', 'B - Holdback Projects')}
                        {renderTable('Completed - Maint HB', 'C - Maintenance Holdback Projects')}
                        {renderTable('Done', 'D - Finished Projects')}
                    </div>
                </>
                :
                <>
                    {renderProjectGrid()}
                </>
            }
        </>

    );
}

// Active, Completed - HB, Completed - Maint HB, Done