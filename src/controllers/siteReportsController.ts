import type { Request, Response } from "express"
import { supabase } from "../lib/supabaseClient.js"
import exceljs from 'exceljs';
import crypto from 'node:crypto'

interface DailyReport{
    parc: string,
    echipa: string[],
    data: string,
    oreLucrate: number,
    inductieOre: number,
    mediuOre: number,
    nearMiss: number,
    toolBox: number
    mentenantaCorectiva: number,
    mentenantaPreventiva: number

}

function isValidDateString(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const parsed = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s;
}

function isValidReport(body: any): body is DailyReport {
  if (typeof body?.parc !== 'string' || body.parc.trim().length === 0) return false;

  if (!Array.isArray(body.echipa) || body.echipa.length === 0) return false;
  if (!body.echipa.every((m: unknown) => typeof m === 'string' && m.trim().length > 0)) return false;

  if(!isValidDateString(body.data))
    return false;

  for (const field of ['oreLucrate', 'inductieOre', 'mediuOre', 'mentenantaPreventiva', 'mentenantaCorectiva'] as const) {
    const v = body[field];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return false;
  }

  if (typeof body.nearMiss !== 'number' || !Number.isInteger(body.nearMiss) || body.nearMiss < 0)
    return false;

  if (typeof body.toolBox !== 'number' || !Number.isInteger(body.toolBox) || body.toolBox < 0)
    return false;

  return true;
}

export const uploadReport = async(req: Request, res: Response) => {

    const userId = req.user;
    if(!isValidReport(req.body)){
        return res.status(400).json({ error: 'Toate campurile sunt obligatorii si neaparat valide' });
    }

    const {parc, echipa, data, oreLucrate, inductieOre, mediuOre, nearMiss, toolBox, mentenantaCorectiva, mentenantaPreventiva} = req.body as DailyReport;

    const {error: reportError} = await supabase.from('site_reports').insert({
        'user_id': userId,
        'parc': parc.trim(),
        'echipa': echipa.map((m: string) => m.trim()),
        'data': data,
        'ore_lucrate': oreLucrate,
        'mediu_ore': mediuOre,
        'inductie_ore': inductieOre,
        'near_miss': nearMiss,
        'toolbox': toolBox,
        'mentenanta_corectiva': mentenantaCorectiva,
        'mentenanta_preventiva': mentenantaPreventiva
    })

    if(reportError){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, message: 'Raport on-site salvat cu success'});
}

export const getAdminReports = async (req: Request, res: Response) => {

    let query = supabase.from('site_reports').select('*').order('data', {ascending: false});
    const parcFilter = req.query.parc;
    if(parcFilter !== undefined){
        if(typeof parcFilter !== 'string'){
            return res.status(400).json({error: 'Invalid filter'});
        }
        query = query.eq('parc', parcFilter.trim());
    }

    const {data, error} = await query
    
    if(error){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: data})
}

export const getReports = async(req: Request, res: Response) => {

    const userId = req.user;

    let query = supabase.from('site_reports').select('*').eq('user_id', userId).order('data', {ascending: false});
    const parcFilter = req.query.parc;
    if(parcFilter !== undefined){
        if(typeof parcFilter !== 'string'){
            return res.status(400).json({error: 'Invalid filter'});
        }
        query = query.eq('parc', parcFilter.trim());
    }

    const {data, error} = await query
    
    if(error){
        return res.status(500).json({error: 'Internal server error'});
    }

    return res.status(200).json({success: true, data: data})
}

export const editReport = async (req: Request, res: Response) => {

    const userId = req.user;
    const reportId = req.params['id'];
    const {data: reportData, error: reportError} = await supabase.from('site_reports').select('*').eq('id', reportId).eq('user_id', userId).maybeSingle();

    if(reportError){
        return res.status(500).json({error: 'Internal server error'});
    }

    if(!reportData){
        return res.status(404).json({error: 'Raport invalid'});
    }

    if(!isValidReport(req.body)){
        return res.status(400).json({ error: 'Toate campurile sunt obligatorii si neaparat valide' });
    }

    const {parc, echipa, data, oreLucrate, inductieOre, mediuOre, nearMiss, toolBox, mentenantaCorectiva, mentenantaPreventiva} = req.body as DailyReport;


    const{error: updateError} = await supabase.from('site_reports').update({
        'parc': parc.trim(),
        'echipa': echipa.map((m: string) => m.trim()),
        'data': data,
        'ore_lucrate': oreLucrate,
        'mediu_ore': mediuOre,
        'inductie_ore': inductieOre,
        'near_miss': nearMiss,
        'toolbox': toolBox,
        'mentenanta_corectiva': mentenantaCorectiva,
        'mentenanta_preventiva': mentenantaPreventiva
    }).eq('id', reportId).eq('user_id', userId);

    if(updateError){
        return res.status(500).json({error: 'Editarea a esuat'});
    }

    return res.status(200).json({success:true, message: 'Raport editat cu success'})

}

export const deleteReport = async(req: Request, res: Response) => {

    try{
        const userId = req.user;

        const reportId = req.params.id;

        const {data: reportData, error: deleteError} = await supabase.from('site_reports').delete().eq('user_id', userId).eq('id', reportId).select('*').maybeSingle();

        if(deleteError){
            console.error('Supabase delete error:', deleteError);
            return res.status(500).json({error: 'Eroare la stergere'});
        }

        if(!reportData){
            return res.status(404).json({error: 'Raport invalid'});
        }

        return res.status(200).json({success: true, message: 'Raport sters cu success'});
    }catch(err){
        console.error('Unexpected error in deleteReport:', err);
        return res.status(500).json({ error: 'Eroare interna a serverului' });
    }
}

interface Report{
    data: string,
    parc: string,
    echipa: string[],
    ore_lucrate: number,
    inductie_ore: number,
    mediu_ore: number,
    near_miss: number,
    toolbox: number,
    mentenanta_corectiva: number,
    mentenanta_preventiva: number
}

export const downloadReports = async (req: Request, res: Response) => {

    try{

        const month = req.query.luna as string;
        const year = req.query.an as string;
        const parc = req.query.parc as string;
        
        let query = supabase.from('site_reports').select('data, parc, echipa, ore_lucrate, inductie_ore, mediu_ore, near_miss, toolbox, mentenanta_corectiva, mentenanta_preventiva').order('data', {ascending: false});
        const{data: reports, error} = await query

        if(error){
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!reports || reports.length === 0) {
            return res.status(404).json({ error: 'Nu există rapoarte' });
        }

        let filteredReports = reports;
        if(month && year){
            filteredReports = filteredReports.filter(report => {
                return report.data && report.data.split('-')[1] === month && report.data.split('-')[0] === year;
            });
        }

        if(parc){
            filteredReports = filteredReports.filter(r => r.parc === parc);
        }

        if(filteredReports.length === 0)
            return res.status(404).json({ error: 'Nu există rapoarte pentru perioada selectată' });

        const grouppedByParc = new Map();
        for(const report of filteredReports){
            if(!grouppedByParc.has(report.parc))
                grouppedByParc.set(report.parc, []);
            grouppedByParc.get(report.parc).push(report);
        }

        let workbook = new exceljs.Workbook();
        for(const parc of grouppedByParc.keys()){
            const safeSheetName = parc.substring(0, 31).replace(/[\\/*?:\[\]]/g, '');
            let worksheet = workbook.addWorksheet(`${safeSheetName}`);
            worksheet.columns = [
                { header: 'Data', key: 'data', width: 15 },
                { header: 'Parc', key: 'parc', width: 25 },
                { header: 'Echipă', key: 'echipa', width: 35 },
                { header: 'Ore lucrate', key: 'ore_lucrate', width: 15 },
                { header: 'Inducție', key: 'inductie_ore', width: 15 },
                { header: 'Mediu', key: 'mediu_ore', width: 15 },
                { header: 'Near miss', key: 'near_miss', width: 15 },
                { header: 'Toolbox', key: 'toolbox', width: 15 },
                { header: 'Ment. corectivă', key: 'mentenanta_corectiva', width: 20 },
                { header: 'Ment. preventivă', key: 'mentenanta_preventiva', width: 20 }
            ];

            const parcReports = grouppedByParc.get(parc);
            const formattedReports = parcReports.map((report: Report) => ({
            ...report,
            //transform array in 1 string
            echipa: Array.isArray(report.echipa) ? report.echipa.join(', ') : report.echipa
            }));

            worksheet.addRows(formattedReports);
        }
        //so the frontend fetch can see the Content-Disposition header
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        res.setHeader("Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        const dateString = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Disposition', 
            "attachment; filename="+`site_reports_${dateString}_${crypto.randomBytes(5).toString('hex')}.xlsx`);
        
        //write the file directly to the response stream
        await workbook.xlsx.write(res);
        res.status(200).end();

    }catch(err){
        if (!res.headersSent) {
            res.status(500).json({ error: 'Eroare la generarea fișierului Excel.' });
        }
    }
}