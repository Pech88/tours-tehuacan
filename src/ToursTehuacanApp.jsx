import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  MapPin,
  Calendar,
  Upload,
  CheckCircle2,
  FileText,
  Download,
  ShieldCheck,
  Lock,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Mail,
  Send,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  CreditCard,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

// ============================================================================
// CONFIGURACIÓN DE SUPABASE (100% EN LA NUBE)
// ============================================================================
const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://gujdphqivdarzairobgz.supabase.co';
const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WFOfzrMRgoeUZ_K4GdDtLw_0tBDqNuJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Datos bancarios y de contacto de la agencia (puedes editarlos aquí)
const AGENCY_BANK_INFO = {
  bank: 'BBVA / Banorte',
  holder: 'Tours Tehuacán',
  clabe: '012 650 01548923412 8',
  card: '4152 3138 9012 4455',
  whatsapp: '238 123 4567',
  email: 'tourstehuacan@gmail.com',
  address: 'Tehuacán, Puebla, México'
};

export default function ToursTehuacanApp() {
  // Navegación principal: 'client' (público) | 'admin' (privado)
  const [view, setView] = useState('client');

  // Estado de autenticación del Administrador
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Catálogo de Tours desde Supabase
  const [tours, setTours] = useState([]);
  const [loadingTours, setLoadingTours] = useState(true);

  // Flujo del Cliente (Pasos 1 al 4)
  const [step, setStep] = useState(1);
  const [selectedTour, setSelectedTour] = useState(null);
  const [passengers, setPassengers] = useState(1);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    companions: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedReservation, setCompletedReservation] = useState(null);

  // Canvas de Firma Digital
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Estado del Panel de Administración
  const [adminTab, setAdminTab] = useState('reservations'); // 'reservations' | 'tours'
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Modales del Administrador
  const [selectedReservationModal, setSelectedReservationModal] = useState(null);
  const [emailModalReservation, setEmailModalReservation] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [contractViewReservation, setContractViewReservation] = useState(null);

  // Modal de Crear / Editar Tour
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [tourForm, setTourForm] = useState({
    title: '',
    destination: '',
    date: '',
    duration: '1 día (Ida y vuelta)',
    price: '',
    deposit: '',
    spots: 15,
    active: true,
    image:
      'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=900&q=80',
    includesText:
      'Transporte redondo desde Tehuacán, Seguro de viajero, Coordinador de grupo'
  });

  // ==========================================================================
  // INICIALIZACIÓN: SESIÓN Y CARGA DE TOURS
  // ==========================================================================
  useEffect(() => {
    fetchTours();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchReservations();
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchReservations();
      } else {
        setReservations([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchTours = async () => {
    setLoadingTours(true);
    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTours(data);
    }
    setLoadingTours(false);
  };

  const fetchReservations = async () => {
    setLoadingReservations(true);
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReservations(data);
    }
    setLoadingReservations(false);
  };

  // ==========================================================================
  // AUTENTICACIÓN ADMINISTRADOR (SUPABASE AUTH)
  // ==========================================================================
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword
    });

    if (error) {
      setAuthError('Credenciales incorrectas o usuario no autorizado.');
    } else if (data?.session) {
      setSession(data.session);
      setAuthPassword('');
      fetchReservations();
    }
    setAuthLoading(false);
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setView('client');
  };

  // ==========================================================================
  // MANEJO DE COMPROBANTE DE PAGO
  // ==========================================================================
  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setSubmitError('La imagen del comprobante no debe superar los 8 MB.');
      return;
    }
    setSubmitError('');
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setReceiptPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ==========================================================================
  // LIENZO DE FIRMA DIGITAL (MOUSE + PANTALLA TÁCTIL)
  // ==========================================================================
  useEffect(() => {
    if (step === 3 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, [step]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    isDrawingRef.current = true;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSignature) setHasSignature(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // ==========================================================================
  // ENVÍO DE RESERVACIÓN + SUBIDA REAL A SUPABASE STORAGE Y POSTGRES
  // ==========================================================================
  const handleFinalizeReservation = async () => {
    if (!acceptedTerms) {
      setSubmitError(
        'Debes aceptar expresamente el contrato y uso de firma electrónica.'
      );
      return;
    }
    if (!hasSignature) {
      setSubmitError('Por favor dibuja tu firma autógrafa dentro del recuadro.');
      return;
    }
    if (!receiptFile) {
      setSubmitError('Falta adjuntar la imagen del comprobante de anticipo.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const folio = `TT-${new Date().getFullYear()}-${Math.floor(
        100000 + Math.random() * 900000
      )}`;
      const fileExt = receiptFile.name.split('.').pop() || 'jpg';
      const filePath = `${folio}_${Date.now()}.${fileExt}`;

      // 1. Subir imagen del comprobante al bucket 'comprobantes'
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, receiptFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir comprobante: ${uploadError.message}`);
      }

      // 2. Obtener URL pública del comprobante
      const { data: publicUrlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath);

      const receiptUrl = publicUrlData.publicUrl;
      const signatureData = canvasRef.current.toDataURL('image/png');
      const totalAmount = Number(selectedTour.price) * Number(passengers);
      const depositAmount = Number(selectedTour.deposit) * Number(passengers);

      const payload = {
        folio,
        tour_id: selectedTour.id,
        tour_title: selectedTour.title,
        tour_date: selectedTour.date,
        passengers: Number(passengers),
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        client_name: clientForm.name.trim(),
        client_email: clientForm.email.trim(),
        client_phone: clientForm.phone.trim(),
        client_id_number: clientForm.idNumber.trim().toUpperCase(),
        companions: clientForm.companions.trim(),
        receipt_url: receiptUrl,
        signature_data: signatureData,
        status: 'pending',
        email_sent: false,
        user_agent: navigator.userAgent
      };

      // 3. Insertar registro en la tabla 'reservations'
      const { error: insertError } = await supabase
        .from('reservations')
        .insert([payload]);

      if (insertError) {
        throw new Error(`Error al registrar reservación: ${insertError.message}`);
      }

      setCompletedReservation({
        ...payload,
        created_at: new Date().toISOString()
      });
      setStep(4);
    } catch (err) {
      setSubmitError(err.message || 'Ocurrió un error al guardar tu reservación.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================================
  // ACCIONES DE ADMINISTRADOR: RESERVACIONES Y CORREO
  // ==========================================================================
  const updateReservationStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      if (selectedReservationModal?.id === id) {
        setSelectedReservationModal((prev) => ({ ...prev, status: newStatus }));
      }
    }
  };

  const markEmailAsSent = async (id) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('reservations')
      .update({ email_sent: true, email_sent_at: now })
      .eq('id', id);

    if (!error) {
      setReservations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, email_sent: true, email_sent_at: now } : r
        )
      );
      if (emailModalReservation?.id === id) {
        setEmailModalReservation((prev) => ({
          ...prev,
          email_sent: true,
          email_sent_at: now
        }));
      }
    }
  };

  const buildConfirmationEmail = (res) => {
    const pendingBalance = Number(res.total_amount) - Number(res.deposit_amount);
    const subject = `Confirmación de Reservación y Recibo de Pago - Folio ${res.folio} | Tours Tehuacán`;
    const body = `Hola ${res.client_name},

¡Gracias por viajar con Tours Tehuacán! Confirmamos que hemos verificado exitosamente tu comprobante de anticipo y tu lugar ha quedado oficialmente reservado.

DETALLES DE TU RESERVACIÓN
----------------------------------------
• Folio de Contrato: ${res.folio}
• Viaje / Destino: ${res.tour_title}
• Fecha de Salida: ${res.tour_date}
• Número de Lugares: ${res.passengers} persona(s)
${res.companions ? `• Acompañantes: ${res.companions}\n` : ''}
RESUMEN DE PAGO
----------------------------------------
• Costo Total del Paquete: $${Number(res.total_amount).toLocaleString('es-MX')} MXN
• Anticipo Verificado: $${Number(res.deposit_amount).toLocaleString('es-MX')} MXN
• Saldo Pendiente a Liquidar antes de abordar: $${pendingBalance.toLocaleString('es-MX')} MXN

RESPALDO LEGAL Y CONTRATO
----------------------------------------
Tu Contrato de Prestación de Servicios Turísticos firmado digitalmente bajo el folio ${res.folio} se encuentra resguardado en nuestro sistema conforme al Art. 89 del Código de Comercio.

Cualquier duda sobre el punto de abordaje en Tehuacán u horarios, contáctanos vía WhatsApp al ${AGENCY_BANK_INFO.whatsapp}.

¡Nos vemos pronto!
Equipo de Tours Tehuacán`;

    return { subject, body };
  };

  // ==========================================================================
  // ACCIONES DE ADMINISTRADOR: GESTIÓN DE TOURS EN SUPABASE
  // ==========================================================================
  const openNewTourModal = () => {
    setEditingTour(null);
    setTourForm({
      title: '',
      destination: '',
      date: '',
      duration: '1 día (Ida y vuelta)',
      price: '',
      deposit: '',
      spots: 15,
      active: true,
      image:
        'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=900&q=80',
      includesText:
        'Transporte redondo desde Tehuacán, Seguro de viajero, Coordinador de grupo'
    });
    setTourModalOpen(true);
  };

  const openEditTourModal = (tour) => {
    setEditingTour(tour);
    setTourForm({
      title: tour.title,
      destination: tour.destination,
      date: tour.date,
      duration: tour.duration,
      price: tour.price,
      deposit: tour.deposit,
      spots: tour.spots,
      active: tour.active,
      image: tour.image || '',
      includesText: Array.isArray(tour.includes) ? tour.includes.join(', ') : ''
    });
    setTourModalOpen(true);
  };

  const handleSaveTour = async (e) => {
    e.preventDefault();
    const includesArray = tourForm.includesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const tourPayload = {
      title: tourForm.title.trim(),
      destination: tourForm.destination.trim(),
      date: tourForm.date.trim(),
      duration: tourForm.duration.trim(),
      price: Number(tourForm.price),
      deposit: Number(tourForm.deposit),
      spots: Number(tourForm.spots),
      active: Boolean(tourForm.active),
      image: tourForm.image.trim(),
      includes: includesArray
    };

    if (editingTour) {
      const { error } = await supabase
        .from('tours')
        .update(tourPayload)
        .eq('id', editingTour.id);
      if (!error) {
        await fetchTours();
        setTourModalOpen(false);
      }
    } else {
      const { error } = await supabase.from('tours').insert([tourPayload]);
      if (!error) {
        await fetchTours();
        setTourModalOpen(false);
      }
    }
  };

  const handleDeleteTour = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este tour del catálogo?')) return;
    const { error } = await supabase.from('tours').delete().eq('id', id);
    if (!error) {
      setTours((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // ==========================================================================
  // COMPONENTE REUTILIZABLE: DOCUMENTO DE CONTRATO LEGAL
  // ==========================================================================
  const renderLegalContractDocument = ({
    folio,
    dateStr,
    clientName,
    clientId,
    clientPhone,
    clientEmail,
    companions,
    tourTitle,
    tourDate,
    passengersCount,
    total,
    deposit,
    signatureImg,
    userAgentStr
  }) => (
    <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 text-slate-800 text-xs sm:text-sm leading-relaxed space-y-4 shadow-sm print:shadow-none print:border-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wide">
            Contrato de Prestación de Servicios Turísticos
          </h3>
          <p className="text-slate-500 text-xs">
            Tours Tehuacán • {AGENCY_BANK_INFO.address} • Tel: {AGENCY_BANK_INFO.whatsapp}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <span className="inline-block bg-slate-100 text-slate-800 font-mono font-bold px-3 py-1 rounded text-xs">
            FOLIO: {folio}
          </span>
          <p className="text-slate-500 text-xs mt-1">Fecha: {dateStr}</p>
        </div>
      </div>

      <p>
        <strong>DECLARACIONES Y PARTES:</strong> Celebran el presente contrato por una parte{' '}
        <strong>TOURS TEHUACÁN</strong> (en adelante &ldquo;LA AGENCIA&rdquo;) y por la otra{' '}
        <strong>{clientName || '[NOMBRE DEL TITULAR]'}</strong>, identificado con{' '}
        <strong>{clientId || '[INE/CURP]'}</strong>, teléfono{' '}
        <strong>{clientPhone || '[TELÉFONO]'}</strong> y correo electrónico{' '}
        <strong>{clientEmail || '[CORREO]'}</strong> (en adelante &ldquo;EL CLIENTE&rdquo;),
        sujetándose al tenor de las siguientes cláusulas:
      </p>

      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500 block">Servicio / Tour Contratado:</span>
          <strong className="text-slate-900">{tourTitle}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Fecha de Salida Programada:</span>
          <strong className="text-slate-900">{tourDate}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Lugares Reservados:</span>
          <strong className="text-slate-900">{passengersCount} pasajero(s)</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Acompañantes Registrados:</span>
          <strong className="text-slate-900">{companions || 'Ninguno'}</strong>
        </div>
        <div>
          <span className="text-slate-500 block">Importe Total / Anticipo Reportado:</span>
          <strong className="text-slate-900">
            ${Number(total).toLocaleString('es-MX')} MXN / Anticipo: $
            {Number(deposit).toLocaleString('es-MX')} MXN
          </strong>
        </div>
        <div>
          <span className="text-slate-500 block">Saldo Pendiente a Liquidar:</span>
          <strong className="text-emerald-700">
            ${(Number(total) - Number(deposit)).toLocaleString('es-MX')} MXN
          </strong>
        </div>
      </div>

      <div className="space-y-2 text-xs text-slate-700">
        <p>
          <strong>PRIMERA (OBJETO):</strong> LA AGENCIA se compromete a prestar los servicios
          turísticos descritos en el itinerario oficial del viaje seleccionado, saliendo desde
          el punto acordado en Tehuacán, Puebla.
        </p>
        <p>
          <strong>SEGUNDA (PAGOS Y LIQUIDACIÓN):</strong> El apartado de lugares se realiza
          mediante el anticipo estipulado, sujeto a validación bancaria del comprobante adjunto.
          El saldo restante deberá liquidarse en su totalidad antes de abordar la unidad el día
          de salida.
        </p>
        <p>
          <strong>TERCERA (CANCELACIONES Y PUNTUALIDAD):</strong> En caso de cancelación por
          parte de EL CLIENTE o inasistencia a la hora de salida programada (tolerancia máxima de
          15 minutos), los anticipos no son reembolsables debido a compromisos previos de
          transporte y hospedaje, pudiendo transferir su lugar a otra persona previo aviso de 48
          horas.
        </p>
        <p>
          <strong>CUARTA (VALIDEZ DE FIRMA ELECTRÓNICA - ART. 89 CÓDIGO DE COMERCIO):</strong>{' '}
          Ambas partes acuerdan y reconocen expresamente que la firma autógrafa digitalizada
          plasmada en este documento electrónico, vinculada al comprobante de transferencia e
          identificación de EL CLIENTE, produce los mismos efectos jurídicos y fuerza obligatoria
          que la firma autógrafa en papel, conforme a los artículos 89 y 93 del Código de Comercio
          y el artículo 1803 del Código Civil Federal.
        </p>
      </div>

      {signatureImg && (
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          <div className="text-center">
            <div className="h-20 flex items-center justify-center border-b border-slate-400 mb-1">
              <span className="font-serif italic text-lg text-slate-700">Tours Tehuacán</span>
            </div>
            <p className="text-xs font-semibold text-slate-700">POR LA AGENCIA</p>
            <p className="text-[11px] text-slate-500">Representación Autorizada</p>
          </div>
          <div className="text-center">
            <div className="h-20 flex items-center justify-center border-b border-slate-400 mb-1">
              <img
                src={signatureImg}
                alt="Firma del Cliente"
                className="max-h-16 object-contain"
              />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {clientName} ({clientId})
            </p>
            <p className="text-[11px] text-slate-500">Firma Electrónica Autógrafa del Titular</p>
          </div>
        </div>
      )}

      {signatureImg && (
        <div className="bg-slate-100 p-3 rounded text-[11px] text-slate-500 font-mono break-all">
          <strong>SELLO DE AUDITORÍA DIGITAL:</strong> Folio {folio} • Timestamp: {dateStr} •
          Dispositivo: {userAgentStr || 'Navegador Web'}
        </div>
      )}
    </div>
  );

  const activeTours = tours.filter((t) => t.active);
  const filteredReservations = reservations.filter((r) =>
    statusFilter === 'all' ? true : r.status === statusFilter
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ====================================================================
          BARRA SUPERIOR DE NAVEGACIÓN
         ==================================================================== */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div
            onClick={() => {
              setView('client');
              setStep(1);
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight">
                Tours Tehuacán
              </h1>
              <p className="text-[11px] text-slate-400">
                Portal Oficial de Reservaciones y Contratos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view === 'client' ? (
              <button
                onClick={() => setView('admin')}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg border border-slate-700 transition"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acceso Agencia</span>
              </button>
            ) : (
              <button
                onClick={() => setView('client')}
                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-medium transition"
              >
                <span>Ver Vista Cliente</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ====================================================================
          VISTA PÚBLICA PARA CLIENTES
         ==================================================================== */}
      {view === 'client' && (
        <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
          {/* Indicador de pasos */}
          {step < 4 && (
            <div className="mb-8 print:hidden">
              <div className="flex items-center justify-between max-w-xl mx-auto">
                {[
                  { num: 1, label: 'Elige tu Viaje' },
                  { num: 2, label: 'Datos y Anticipo' },
                  { num: 3, label: 'Revisa y Firma' }
                ].map((item, idx) => (
                  <React.Fragment key={item.num}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition ${
                          step >= item.num
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {step > item.num ? <Check className="w-5 h-5" /> : item.num}
                      </div>
                      <span
                        className={`text-xs mt-1.5 font-medium ${
                          step >= item.num ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded ${
                          step > item.num ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* PASO 1: CATÁLOGO DE TOURS */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Próximas Salidas desde Tehuacán
                </h2>
                <p className="text-slate-600 text-sm mt-1">
                  Selecciona el destino de tu preferencia para apartar tus lugares y generar tu
                  contrato digital.
                </p>
              </div>

              {loadingTours ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                  <p className="text-sm">Cargando viajes disponibles...</p>
                </div>
              ) : activeTours.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                  <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-900 text-lg">
                    Aún no hay viajes publicados
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Si eres el administrador, entra a <strong>Acceso Agencia</strong> para
                    publicar tus primeros tours en la nube.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeTours.map((tour) => (
                    <div
                      key={tour.id}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                    >
                      <div className="relative h-48 bg-slate-200">
                        <img
                          src={
                            tour.image ||
                            'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=900&q=80'
                          }
                          alt={tour.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 bg-slate-900/85 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                          {tour.duration}
                        </span>
                        <span className="absolute bottom-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                          {tour.spots} lugares disp.
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mb-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{tour.date}</span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">{tour.title}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" /> {tour.destination}
                          </p>

                          {Array.isArray(tour.includes) && tour.includes.length > 0 && (
                            <ul className="mt-3 space-y-1">
                              {tour.includes.slice(0, 3).map((inc, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-slate-600 flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>{inc}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-slate-500 block">
                              Precio por persona
                            </span>
                            <span className="text-xl font-extrabold text-slate-900">
                              ${Number(tour.price).toLocaleString('es-MX')}{' '}
                              <span className="text-xs font-normal text-slate-500">MXN</span>
                            </span>
                            <span className="text-[11px] text-emerald-700 font-medium block">
                              Aparta con ${Number(tour.deposit).toLocaleString('es-MX')} MXN
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedTour(tour);
                              setPassengers(1);
                              setStep(2);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                          >
                            <span>Reservar</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 2: DATOS DEL CLIENTE Y COMPROBANTE DE ANTICIPO */}
          {step === 2 && selectedTour && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-semibold text-emerald-600 uppercase">
                    Paso 2 de 3
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Datos del Titular y Comprobante
                  </h2>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Cambiar viaje
                </button>
              </div>

              {/* Resumen económico */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">{selectedTour.title}</h3>
                  <p className="text-xs text-slate-600">Salida: {selectedTour.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">Lugares:</label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900"
                  >
                    {[...Array(Math.min(15, selectedTour.spots || 15))].map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} {idx === 0 ? 'persona' : 'personas'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 text-white p-4 rounded-xl">
                <div>
                  <span className="text-xs text-slate-400 block">Total del Paquete</span>
                  <span className="text-lg font-bold">
                    ${(Number(selectedTour.price) * passengers).toLocaleString('es-MX')} MXN
                  </span>
                </div>
                <div>
                  <span className="text-xs text-emerald-400 block">
                    Anticipo Requerido para Apartar
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    ${(Number(selectedTour.deposit) * passengers).toLocaleString('es-MX')} MXN
                  </span>
                </div>
              </div>

              {/* Datos bancarios para depósito */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Datos para Transferencia o Depósito de Anticipo:
                </p>
                <p className="text-slate-600">
                  <strong>Banco:</strong> {AGENCY_BANK_INFO.bank} • <strong>Titular:</strong>{' '}
                  {AGENCY_BANK_INFO.holder}
                </p>
                <p className="text-slate-600 font-mono">
                  <strong>CLABE:</strong> {AGENCY_BANK_INFO.clabe} • <strong>Tarjeta:</strong>{' '}
                  {AGENCY_BANK_INFO.card}
                </p>
              </div>

              {/* Formulario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo del Titular *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. María Fernanda López"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico (para recibir confirmación) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="cliente@correo.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono / WhatsApp (10 dígitos) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="238 000 0000"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clave de Elector (INE) o CURP *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Para validez legal del contrato"
                    value={clientForm.idNumber}
                    onChange={(e) => setClientForm({ ...clientForm, idNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {passengers > 1 && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombres de los Acompañantes ({passengers - 1} adicionales)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez, Sofía López"
                      value={clientForm.companions}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, companions: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                )}

                {/* Carga de Comprobante */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Sube la Captura o Foto de tu Comprobante de Anticipo *
                  </label>
                  <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition">
                    {receiptPreview ? (
                      <div className="text-center space-y-2">
                        <img
                          src={receiptPreview}
                          alt="Vista previa comprobante"
                          className="max-h-44 mx-auto rounded-lg shadow-sm"
                        />
                        <span className="text-xs text-emerald-700 font-semibold block">
                          Comprobante cargado ({receiptFile?.name}) — Clic para cambiar
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm font-medium text-slate-700">
                          Toca aquí para seleccionar imagen del comprobante
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5">
                          JPG, PNG o captura de pantalla (Máx. 8 MB)
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (
                      !clientForm.name.trim() ||
                      !clientForm.email.includes('@') ||
                      !clientForm.phone.trim() ||
                      !clientForm.idNumber.trim()
                    ) {
                      setSubmitError(
                        'Por favor completa todos los campos obligatorios (incluyendo un correo válido).'
                      );
                      return;
                    }
                    if (!receiptFile) {
                      setSubmitError(
                        'Por favor adjunta la imagen del comprobante de anticipo.'
                      );
                      return;
                    }
                    setSubmitError('');
                    setStep(3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition shadow-sm"
                >
                  <span>Generar Contrato para Firmar</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: REVISIÓN DE CONTRATO Y FIRMA DIGITAL */}
          {step === 3 && selectedTour && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-600 uppercase">
                    Paso 3 de 3
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    Revisa tu Contrato y Firma Digitalmente
                  </h2>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Editar datos
                </button>
              </div>

              {/* Vista previa del contrato */}
              {renderLegalContractDocument({
                folio: 'VISTA PREVIA',
                dateStr: new Date().toLocaleDateString('es-MX'),
                clientName: clientForm.name,
                clientId: clientForm.idNumber,
                clientPhone: clientForm.phone,
                clientEmail: clientForm.email,
                companions: clientForm.companions,
                tourTitle: selectedTour.title,
                tourDate: selectedTour.date,
                passengersCount: passengers,
                total: Number(selectedTour.price) * passengers,
                deposit: Number(selectedTour.deposit) * passengers,
                signatureImg: null
              })}

              {/* Área de Firma Autógrafa */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900">
                    Dibuja tu Firma Autógrafa aquí (con tu dedo o mouse) *
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs text-red-600 hover:underline font-medium"
                  >
                    Limpiar firma
                  </button>
                </div>

                <div className="border-2 border-slate-300 rounded-xl bg-slate-50 overflow-hidden touch-none">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-44 cursor-crosshair block"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    He leído y acepto los términos del Contrato de Prestación de Servicios
                    Turísticos y consiento expresamente el uso de mi firma electrónica autógrafa
                    conforme al Art. 89 del Código de Comercio.
                  </span>
                </label>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  onClick={handleFinalizeReservation}
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Guardando contrato y comprobante en la nube...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Firmar Contrato y Enviar Reservación</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 4: CONFIRMACIÓN Y DESCARGA PDF */}
          {step === 4 && completedReservation && (
            <div className="space-y-6">
              <div className="bg-emerald-600 text-white rounded-2xl p-6 sm:p-8 text-center space-y-2 shadow-md print:hidden">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-200" />
                <h2 className="text-2xl font-bold">¡Contrato Firmado y Registrado!</h2>
                <p className="text-sm text-emerald-100 max-w-lg mx-auto">
                  Tu reservación con folio <strong>{completedReservation.folio}</strong> ya está
                  en nuestra base de datos. En breve validaremos tu depósito y te enviaremos tu
                  confirmación oficial a <strong>{completedReservation.client_email}</strong>.
                </p>
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar / Guardar Contrato en PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setStep(1);
                      setCompletedReservation(null);
                      setReceiptFile(null);
                      setReceiptPreview('');
                      setAcceptedTerms(false);
                      setHasSignature(false);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition"
                  >
                    Hacer otra reservación
                  </button>
                </div>
              </div>

              {/* Documento final listo para imprimir/guardar como PDF */}
              {renderLegalContractDocument({
                folio: completedReservation.folio,
                dateStr: new Date(completedReservation.created_at).toLocaleString('es-MX'),
                clientName: completedReservation.client_name,
                clientId: completedReservation.client_id_number,
                clientPhone: completedReservation.client_phone,
                clientEmail: completedReservation.client_email,
                companions: completedReservation.companions,
                tourTitle: completedReservation.tour_title,
                tourDate: completedReservation.tour_date,
                passengersCount: completedReservation.passengers,
                total: completedReservation.total_amount,
                deposit: completedReservation.deposit_amount,
                signatureImg: completedReservation.signature_data,
                userAgentStr: completedReservation.user_agent
              })}
            </div>
          )}
        </main>
      )}

      {/* ====================================================================
          VISTA PRIVADA DE ADMINISTRADOR (PROTEGIDA CON SUPABASE AUTH)
         ==================================================================== */}
      {view === 'admin' && (
        <main className="max-w-6xl mx-auto px-4 py-8">
          {!session ? (
            /* FORMULARIO DE INICIO DE SESIÓN */
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Panel Privado de Agencia</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Inicia sesión con tu cuenta autorizada de Tours Tehuacán
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo de Administrador
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="tourstehuacan@gmail.com"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition"
                >
                  {authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Entrar al Panel</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* DASHBOARD ADMINISTRATIVO AUTENTICADO */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Control de Reservaciones y Tours
                  </h2>
                  <p className="text-xs text-slate-500">
                    Conectado como: <strong>{session.user.email}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAdminTab('reservations')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      adminTab === 'reservations'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Reservaciones ({reservations.length})
                  </button>
                  <button
                    onClick={() => setAdminTab('tours')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      adminTab === 'tours'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Catálogo de Tours ({tours.length})
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Salir
                  </button>
                </div>
              </div>

              {/* PESTAÑA 1: RESERVACIONES RECIBIDAS */}
              {adminTab === 'reservations' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'all', label: 'Todas' },
                        { id: 'pending', label: 'Pendientes de Verificar' },
                        { id: 'verified', label: 'Anticipo Verificado' },
                        { id: 'paid', label: 'Liquidadas' },
                        { id: 'cancelled', label: 'Canceladas' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setStatusFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            statusFilter === tab.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={fetchReservations}
                      className="text-xs text-emerald-700 font-semibold hover:underline"
                    >
                      Actualizar lista
                    </button>
                  </div>

                  {loadingReservations ? (
                    <div className="text-center py-12 text-slate-500">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-600 mb-2" />
                      <p className="text-xs">Cargando reservaciones desde Supabase...</p>
                    </div>
                  ) : filteredReservations.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-sm">
                      No hay reservaciones en esta categoría todavía.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredReservations.map((res) => (
                        <div
                          key={res.id}
                          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-1 rounded text-slate-800">
                                {res.folio}
                              </span>
                              <h3 className="font-bold text-slate-900 text-base mt-1.5">
                                {res.client_name}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {res.client_email} • {res.client_phone}
                              </p>
                            </div>

                            <div className="text-right space-y-1">
                              <span
                                className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                  res.status === 'verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : res.status === 'paid'
                                    ? 'bg-blue-100 text-blue-800'
                                    : res.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {res.status === 'verified'
                                  ? 'Anticipo Verificado'
                                  : res.status === 'paid'
                                  ? 'Liquidado'
                                  : res.status === 'cancelled'
                                  ? 'Cancelado'
                                  : 'Pendiente de Verificar'}
                              </span>

                              {res.email_sent && (
                                <span className="block text-[10px] font-semibold text-emerald-700">
                                  ✓ Confirmación enviada
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 border border-slate-100">
                            <p className="font-semibold text-slate-800">{res.tour_title}</p>
                            <p className="text-slate-600">
                              Salida: {res.tour_date} • <strong>{res.passengers} lugar(es)</strong>
                            </p>
                            <p className="text-slate-700">
                              Anticipo:{' '}
                              <strong>
                                ${Number(res.deposit_amount).toLocaleString('es-MX')} MXN
                              </strong>{' '}
                              / Total: ${Number(res.total_amount).toLocaleString('es-MX')} MXN
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              onClick={() => setSelectedReservationModal(res)}
                              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Revisar Depósito</span>
                            </button>

                            <button
                              onClick={() => setEmailModalReservation(res)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Enviar Confirmación</span>
                            </button>

                            <button
                              onClick={() => setContractViewReservation(res)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl flex items-center gap-1"
                              title="Ver Contrato Firmado"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 2: CATÁLOGO DE TOURS */}
              {adminTab === 'tours' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Viajes Publicados</h3>
                    <button
                      onClick={openNewTourModal}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Nuevo Tour
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tours.map((tour) => (
                      <div
                        key={tour.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                tour.active ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            />
                            <h4 className="font-bold text-slate-900 text-sm">{tour.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tour.date} • ${Number(tour.price).toLocaleString('es-MX')} MXN
                            (Anticipo ${Number(tour.deposit).toLocaleString('es-MX')})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditTourModal(tour)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTour(tour.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* ====================================================================
          MODAL: REVISAR COMPROBANTE DE DEPÓSITO Y CAMBIAR ESTADO
         ==================================================================== */}
      {selectedReservationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">
                  Comprobante — {selectedReservationModal.folio}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedReservationModal.client_name} • Anticipo esperado: $
                  {Number(selectedReservationModal.deposit_amount).toLocaleString('es-MX')} MXN
                </p>
              </div>
              <button
                onClick={() => setSelectedReservationModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 rounded-xl p-2 flex justify-center">
              <img
                src={selectedReservationModal.receipt_url}
                alt="Comprobante de transferencia"
                className="max-h-96 rounded-lg object-contain"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Actualizar Estado del Pago:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    updateReservationStatus(selectedReservationModal.id, 'verified')
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl"
                >
                  ✓ Aprobar Anticipo
                </button>
                <button
                  onClick={() => updateReservationStatus(selectedReservationModal.id, 'paid')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl"
                >
                  ★ Marcar Liquidado
                </button>
                <button
                  onClick={() =>
                    updateReservationStatus(selectedReservationModal.id, 'pending')
                  }
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold py-2 rounded-xl"
                >
                  Dejar Pendiente
                </button>
                <button
                  onClick={() =>
                    updateReservationStatus(selectedReservationModal.id, 'cancelled')
                  }
                  className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold py-2 rounded-xl"
                >
                  Cancelar Reserva
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                const current = selectedReservationModal;
                setSelectedReservationModal(null);
                setEmailModalReservation(current);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Enviar Confirmación de Pago por Correo</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: ENVIAR CONFIRMACIÓN POR CORREO ELECTRÓNICO
         ==================================================================== */}
      {emailModalReservation &&
        (() => {
          const { subject, body } = buildConfirmationEmail(emailModalReservation);
          const mailtoLink = `mailto:${encodeURIComponent(
            emailModalReservation.client_email
          )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

          return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Confirmación de Reservación y Recibo
                    </h3>
                    <p className="text-xs text-slate-500">
                      Para: <strong>{emailModalReservation.client_email}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setEmailModalReservation(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-600 block mb-1">Asunto:</span>
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-medium text-slate-800">
                      {subject}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block mb-1">
                      Mensaje de Confirmación:
                    </span>
                    <textarea
                      readOnly
                      rows={11}
                      value={body}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-lg font-mono text-xs text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <a
                    href={mailtoLink}
                    onClick={() => markEmailAsSent(emailModalReservation.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Abrir en mi App de Correo</span>
                  </a>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${subject}\n\n${body}`);
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2500);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => markEmailAsSent(emailModalReservation.id)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-3 px-4 rounded-xl"
                  >
                    Marcar Enviado
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ====================================================================
          MODAL: VER CONTRATO FIRMADO DESDE EL ADMIN
         ==================================================================== */}
      {contractViewReservation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between print:hidden">
              <h3 className="font-bold text-slate-900">
                Contrato Firmado — {contractViewReservation.folio}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setContractViewReservation(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {renderLegalContractDocument({
              folio: contractViewReservation.folio,
              dateStr: new Date(contractViewReservation.created_at).toLocaleString('es-MX'),
              clientName: contractViewReservation.client_name,
              clientId: contractViewReservation.client_id_number,
              clientPhone: contractViewReservation.client_phone,
              clientEmail: contractViewReservation.client_email,
              companions: contractViewReservation.companions,
              tourTitle: contractViewReservation.tour_title,
              tourDate: contractViewReservation.tour_date,
              passengersCount: contractViewReservation.passengers,
              total: contractViewReservation.total_amount,
              deposit: contractViewReservation.deposit_amount,
              signatureImg: contractViewReservation.signature_data,
              userAgentStr: contractViewReservation.user_agent
            })}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: CREAR O EDITAR TOUR
         ==================================================================== */}
      {tourModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">
                {editingTour ? 'Editar Tour' : 'Publicar Nuevo Tour'}
              </h3>
              <button
                onClick={() => setTourModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTour} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nombre del Viaje *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Veracruz y Acuario Michin"
                  value={tourForm.title}
                  onChange={(e) => setTourForm({ ...tourForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Destino *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Puerto de Veracruz"
                    value={tourForm.destination}
                    onChange={(e) =>
                      setTourForm({ ...tourForm, destination: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Fecha de Salida *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 15 de Diciembre 2026"
                    value={tourForm.date}
                    onChange={(e) => setTourForm({ ...tourForm, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Precio Total ($) *
                  </label>
                  <input
                    type="number"
                    required
                    value={tourForm.price}
                    onChange={(e) => setTourForm({ ...tourForm, price: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Anticipo ($) *
                  </label>
                  <input
                    type="number"
                    required
                    value={tourForm.deposit}
                    onChange={(e) => setTourForm({ ...tourForm, deposit: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cupos *</label>
                  <input
                    type="number"
                    required
                    value={tourForm.spots}
                    onChange={(e) => setTourForm({ ...tourForm, spots: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Duración</label>
                <input
                  type="text"
                  value={tourForm.duration}
                  onChange={(e) => setTourForm({ ...tourForm, duration: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  ¿Qué incluye? (separado por comas)
                </label>
                <input
                  type="text"
                  value={tourForm.includesText}
                  onChange={(e) =>
                    setTourForm({ ...tourForm, includesText: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  URL de Imagen del Destino
                </label>
                <input
                  type="url"
                  value={tourForm.image}
                  onChange={(e) => setTourForm({ ...tourForm, image: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tourForm.active}
                  onChange={(e) => setTourForm({ ...tourForm, active: e.target.checked })}
                  className="accent-emerald-600"
                />
                <span className="font-semibold text-slate-700">
                  Tour activo (visible para clientes)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTourModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Guardar Tour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}