import { NextResponse } from "next/server";
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// GET - Obtener todos los correos programados
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    
    let q = query(
      collection(db, 'scheduledEmails'),
      orderBy('scheduledDate', 'desc')
    );

    if (status) {
      q = query(
        collection(db, 'scheduledEmails'),
        where('status', '==', status),
        orderBy('scheduledDate', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const scheduledEmails = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ scheduledEmails });
  } catch (error) {
    console.error("Error obteniendo correos programados:", error);
    return NextResponse.json(
      { error: "Error al obtener correos programados" },
      { status: 500 }
    );
  }
}

// PATCH - Cancelar un correo programado
export async function PATCH(req: Request) {
  try {
    const { id, cancelledBy } = await req.json();

    if (!id || !cancelledBy) {
      return NextResponse.json(
        { error: "ID y cancelledBy son requeridos" },
        { status: 400 }
      );
    }

    const docRef = doc(db, 'scheduledEmails', id);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy,
    });

    return NextResponse.json({
      success: true,
      message: "Correo programado cancelado exitosamente"
    });
  } catch (error) {
    console.error("Error cancelando correo programado:", error);
    return NextResponse.json(
      { error: "Error al cancelar correo programado" },
      { status: 500 }
    );
  }
}
