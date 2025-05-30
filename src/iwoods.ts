import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import supabase from "@/supabase";
import { IwoodsMonitoringResponse, IwoodsWODetailResponse } from "./dtos";
import { IwoodsItem } from "./types";
import { IWOODS_EMAIL, IWOODS_SECRET, SPREADSHEET_ID } from "./constants";
import { authorize } from "./sheets";
import { google } from "googleapis";

export async function logInToIWoods() {
    const authUrl = "https://layanan.pln.co.id:8060/login"
    const { data: { status, token } } = await axios.post<{ status: number, token: string }>(
        authUrl, 
        {
            email: IWOODS_EMAIL,
            password: IWOODS_SECRET
        }
    )

    if (status !== 200)
        return null

    return token
}

export const iwoodsAxios = axios.create()

iwoodsAxios.interceptors.response.use(
    // Return response as is on no error
    res => res, 
    async (err) => {
        if (err instanceof AxiosError && err.config) {
            const originalConfig: InternalAxiosRequestConfig & { _retry?: boolean } = { ...err.config }
            if (err.response?.status === 401 && !originalConfig._retry) {
                console.log("Invalid token, renewing.... Current token: ", err.config.headers.getAuthorization())
                originalConfig._retry = true
                try {
                    const authUrl = "https://layanan.pln.co.id:8060/login"
                    const { data: { status, token } } = await axios.post<{ status: number, token: string }>(
                        authUrl, 
                        {
                            email: IWOODS_EMAIL,
                            password: IWOODS_SECRET
                        }
                    )
                    
                    if (status === 200 && token)
                        originalConfig.headers.setAuthorization(`Bearer ${token}`)

                    console.log("Logged in: ", token)
                    return iwoodsAxios.request(originalConfig)
                } catch (err) {
                    console.error('Error refreshing token: ', err)
                }
            }
        }

        throw new Error("Unexpected error")
    }
)

export async function dumpIwoods(token: string) {
    console.log("Dumping data from IWoods")
    const PAGE_SIZE = 500
    // Get total elements
    const { config, data: { status, totalElements } } = await iwoodsAxios.get<IwoodsMonitoringResponse>(
        "https://layanan.pln.co.id:8060/api/v1/homechargings/dealer?dealerId=&page=1&size=1", /* CS1 */
        // "https://layanan.pln.co.id:8060/api/v1/homechargings/monitoring?page=1&size=1",
        { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (status !== 200)
        throw new Error("Error fetching total elements")

    const totalPages = Math.ceil(totalElements / PAGE_SIZE);

    for (let i = 1; i <= totalPages; i++) {
        const pageItems: IwoodsItem[] = [];
        console.log(`Fetching page ${i} of ${totalPages}`);
        const { data: { status, message, data } } = await iwoodsAxios.get<IwoodsMonitoringResponse>(
            `https://layanan.pln.co.id:8060/api/v1/homechargings/dealer?page=${i}&size=${PAGE_SIZE}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (status === 200 && message === 'success') {
            // Iterate through each item in the page
            for (const item of data) {
                pageItems.push({
                    id: item.id,
                    agendaNumber: item.no_agenda,
                    iwoodsInputDate: new Date(item.created_at),
                    iwoodsApproveDate: item.tgl_approve_atpm ? new Date(item.tgl_approve_atpm) : undefined,
                    isOn: item.status_terakhir_pbpd === 'Nyala' ? true : false,
                    vin: item.nomor_rangka
                })
            }
        } else {
            throw new Error(`Error fetching page ${i}: ${message}`);
        }

        // Upsert page data into Supabase
        const { error, data: upsertedPageItems } = await supabase
            .from('iwoods-items')
            .upsert(pageItems, { ignoreDuplicates: true })
            .select()

        if (error) {
            throw new Error(`Error upserting data: ${error.message}`);
        }

    }
}

export async function checkUpdates(token: string) {
    // Get iwoods items that have not been on
    const { error, data } = await supabase
        .from("iwoods-items")
        .select('*')
        .is('electricityInstallDate', null)
        .is('isOn', true)
        .order('id', { ascending: true })
        .overrideTypes<IwoodsItem[]>()

    if (error || !data) {
        throw new Error(`Error fetching iwoods items: ${error.message}`);
    }

    const updatedItems: Partial<IwoodsItem>[] = []
    // Iterate through data
    for (const item of data) {
        const { id, agendaNumber } = item

        // If isOn is true, agenda number must exist anyway
        if (!agendaNumber)
            continue

        console.log(`Fetching details on ID: ${id}, agenda number: ${agendaNumber}`)
        // Query each data
        const { data: { data } } = await iwoodsAxios.get<IwoodsWODetailResponse>(
            `https://layanan.pln.co.id:8060/integrasi/ap2t/getHistoryStatusAgenda/findAll?homeChargingId=${id}&noAgenda=${agendaNumber}`,
            { headers: { Authorization: `Bearer ${token}` } }
        )

        // Iterate each task
        for (const task of data) {
            if (task.keterangan === 'Nyala') {
                console.log(`Electricity on, id: ${id}, agenda: ${agendaNumber}, install date: ${new Date(task.tgl_transaksi)}`)
                const { error, data } = await supabase
                    .from('iwoods-items')
                    .update({
                        id,
                        isOn: true,
                        electricityInstallDate: new Date(task.tgl_transaksi).toISOString()
                    })
                    .eq('id', id)
                    .select()
                    .single<IwoodsItem>()

                if (error || !data)
                    throw new Error(`Error while updating to supabase: ${error?.message || 'no data returned'}`)
                
                console.log(`Item updated, id: ${id}, agenda: ${agendaNumber}`)
                updatedItems.push(data)
                // console.log(`Item to be updated, id: ${id}, agenda: ${agendaNumber}`)
                // updatedItems.push({
                //     id,
                //     isOn: true,
                //     electricityInstallDate: new Date(task.tgl_transaksi).toISOString()
                // })
                break; // ✅ break exits the loop early
            }
        }
    }

    // const { error: upsertError, data: upsertData } = await supabase
    // .from('iwoods-items')
    // .upsert(updatedItems, { ignoreDuplicates: false })
    // .select()

    // if (upsertError)
    //     throw new Error('Error while upserting check updates: ' + upsertError.message)

    // return upsertData as IwoodsItem[]
    return updatedItems
}

export async function getNewest(token: string) {
    // Get last 100 entries from Iwoods
    const { data: { status, message, data } } = await iwoodsAxios.get<IwoodsMonitoringResponse>(
        `https://layanan.pln.co.id:8060/api/v1/homechargings/monitoring?page=1&size=100`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (status > 299 && message !== 'success') 
        throw new Error(`Error fetching last 100 entries`);

    // Map response
    const dataMapped: IwoodsItem[] = []
    for (const item of data) {
        dataMapped.push({
            id: item.id,
            agendaNumber: item.no_agenda,
            iwoodsInputDate: new Date(item.created_at),
            iwoodsApproveDate: item.tgl_approve_atpm ? new Date(item.tgl_approve_atpm) : undefined,
            isOn: item.status_terakhir_pbpd === 'Nyala' ? true : false,
            vin: item.nomor_rangka
        })
    }
    // Upsert to supabase
    const { error, data: newItems } = await supabase
        .from('iwoods-items')
        .upsert(dataMapped, { ignoreDuplicates: true })
        .select<'*', IwoodsItem>()

    if (error || !data)
        throw new Error(`Error while upserting: ${error?.message || 'no data updated'}`)

    return newItems
}

export async function dumpSupabaseToSheets() {
    const auth = await authorize()

    const sheets = google.sheets({
        version: 'v4',
        auth
    })

    console.log('Reseting IWOODS sheet')
    await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: "IWOODS!A2:Z"
    })
    console.log('Reset IWOODS sheet')

    // Get all data from supabase
    console.log('Fetching all IWood items from Supabase')
    const { error, data } = await supabase
        .from('iwoods-items')
        .select('*')
        .order('id', { ascending: true })
        .overrideTypes<IwoodsItem[]>()

    if (error && !data)
        throw new Error(`Error while fetching all IWoods items: ${error.message}`)

    // Write to IWOODS sheet
    console.log('Writing to IWOODS sheet')
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `IWOODS!A2`,
        includeValuesInResponse: true,
        valueInputOption: 'RAW',
        requestBody: {
            values: data.map((item) => [
                item.id,
                item.vin,
                item.agendaNumber,
                item.iwoodsInputDate,
                item.iwoodsApproveDate,
                item.isOn,
                item.electricityInstallDate
            ])
        }
    })
    console.log('Successfully wrote to IWOODS sheet')

    return data as IwoodsItem[]
}