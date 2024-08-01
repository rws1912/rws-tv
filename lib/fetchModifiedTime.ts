import { useModifiedTime } from "@/context/ModifiedTimeContext";
import { supabase } from "./supabaseClient";

const tables = ['QuotedProjects', 'Categories', 'CategoryDataValues', 'ColumnDefinitions', 'equipmentRows', 'equipmentCells', 'equipmentColumns', 'equipmentType'];

interface UpdateInfo {
    table: string;
    updated_at: Date;
}

export const useFetchModifiedTime = () => {
    const { updateLastModifiedTime } = useModifiedTime();

    const fetchModifiedTime = async (): Promise<UpdateInfo | null> => {
        console.log("fetch modified time called");
        try {
            const promises = tables.map(table =>
                supabase
                    .from(table)
                    .select('updated_at')
                    .order('updated_at', { ascending: false })
                    .limit(1)
            );

            const results = await Promise.all(promises);

            console.log("results", results);

            const latestTimestamps: UpdateInfo[] = results
                .map((result, index) => {
                    if (result.data && result.data.length > 0 && result.data[0].updated_at) {
                        return {
                            table: tables[index],
                            updated_at: new Date(result.data[0].updated_at)
                        };
                    }
                    return null;
                })
                .filter((item): item is UpdateInfo => item !== null);
            
            console.log(latestTimestamps);
            if (latestTimestamps.length > 0) {
                const mostRecentUpdate = latestTimestamps.reduce((prev, current) =>
                    (prev.updated_at > current.updated_at) ? prev : current
                );

                console.log('Most recent update:', mostRecentUpdate.table, mostRecentUpdate.updated_at);
                updateLastModifiedTime(mostRecentUpdate.updated_at);
                return mostRecentUpdate;
            } else {
                console.log('No updates found in any table');
                return null;
            }
        } catch (error) {
            console.error('Error fetching modified times:', error);
            return null;
        }
    };

    return fetchModifiedTime;
};