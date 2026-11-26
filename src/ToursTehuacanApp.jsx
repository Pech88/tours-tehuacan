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
  Tag,
  Table as TableIcon,
  ExternalLink
} from 'lucide-react';

// ============================================================================
// CONFIGURACIÓN DE SUPABASE (100% EN LA NUBE)
// ============================================================================
const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://gujdphqivdarzairobgz.supabase.co';
const SUPABASE_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WFOfzrMRgoeUZ_K4GdDtLw_0tBDqNuJ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Datos oficiales de Tours Tehuacán y cuentas Banorte
const AGENCY_INFO = {
  name: 'TOURS TEHUACÁN',
  slogan: 'EL VIAJE QUE TE MERECES',
  logoSrc: '/logo-tours-tehuacan.png',
  address: '13 Poniente #1007A Fraccionamiento Concordia. Tehuacán, Puebla cp. 75763',
  facebookName: 'Tours Tehuacán',
  facebookUrl: 'https://www.facebook.com/share/1JiYBLVWYH/',
  instagramHandle: '@tourstehuacan',
  instagramUrl: 'https://www.instagram.com/tourstehuacan?knvt=MWwyNXFsdm5ldDhnMQ==',
  rnt: '𝟯𝟱𝟮𝟭𝟭𝟱𝟲𝟭𝗰𝟳𝗱𝗰𝟭',
  phone: '2381280864',
  email: 'tourstehuacan@gmail.com',
  bank: 'BANORTE',
  holder: 'Maria de Jesús Herrera Rendón',
  card: '5264246831944813',
  clabe: '072670012809081786',
  accountNumber: '1280908178'
};

// Códigos promocionales / preferenciales válidos (puedes agregar más aquí)
const VALID_CODES = {
  CLIENTE: { label: 'Precio Cliente', discountRate: null, useClientPrice: true },
  TEHUACAN10: { label: 'Código Preferencial', discountRate: 0.1, useClientPrice: true },
  VIP15: { label: 'Código Especial', discountRate: 0.15, useClientPrice: true }
};

// Validación formal de CURP (18 caracteres) o Clave de Elector INE (18 caracteres)
const CURP_REGEX =
  /^[A-Z]{4}\d{6}[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS)[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9]\d$/;
const INE_KEY_REGEX =
  /^[B-DF-HJ-NP-TV-Z]{6}\d{6}[HM]\d{2}[A-Z0-9]{3}$/;

function validateCurpOrIne(rawValue, titularName = '') {
  const clean = (rawValue || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) {
    return { valid: false, message: 'Ingresa tu CURP o Clave de Elector (INE).' };
  }

  const isCurp = CURP_REGEX.test(clean);
  const isIne = INE_KEY_REGEX.test(clean);

  if (!isCurp && !isIne) {
    return {
      valid: false,
      message:
        'El formato no corresponde a una CURP (18 caracteres) ni a una Clave de Elector de INE válida.'
    };
  }

  const nameTokens = titularName
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  if (isCurp && nameTokens.length >= 2) {
    const firstLastName = nameTokens[nameTokens.length - 2] || nameTokens[0];
    const firstGivenName = nameTokens[0];
    const curpInitial1 = clean[0];
    const curpVowel1 = clean[1];
    const curpInitial2 = clean[3];

    const firstVowelInLast =
      firstLastName.slice(1).match(/[AEIOU]/)?.[0] || '';

    if (
      curpInitial1 !== firstLastName[0] ||
      curpInitial2 !== firstGivenName[0] ||
      (firstVowelInLast && curpVowel1 !== firstVowelInLast)
    ) {
      return {
        valid: false,
        message:
          'Las iniciales de la CURP no coinciden con el nombre del titular ingresado. Revísalo por favor.'
      };
    }
  }

  if (isIne && nameTokens.length >= 2) {
    const apellidoPaterno = nameTokens[nameTokens.length - 2] || '';
    const apellidoMaterno = nameTokens[nameTokens.length - 1] || '';
    const nombre = nameTokens[0] || '';
    const ineInitials = clean.slice(0, 6);
    const expectedInitials = `${apellidoPaterno.slice(0, 2)}${apellidoMaterno.slice(
      0,
      2
    )}${nombre.slice(0, 2)}`.padEnd(6, 'X');

    if (ineInitials !== expectedInitials) {
      return {
        valid: false,
        message:
          'Las primeras letras de la Clave de Elector (INE) no coinciden con el nombre del titular.'
      };
    }
  }

  return {
    valid: true,
    type: isCurp ? 'CURP' : 'Clave de Elector INE',
    normalized: clean
  };
}

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
  const [seatsCount, setSeatsCount] = useState(1);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCode, setAppliedCode] = useState(null);
  const [promoFeedback, setPromoFeedback] = useState('');

  // Niños
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenCount, setChildrenCount] = useState(1);
  const [childrenAges, setChildrenAges] = useState(['']);

  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    emergencyContact: '',
    email: '',
    idNumber: '',
    seatNamesList: ['']
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [copiedBankField, setCopiedBankField] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [completedReservation, setCompletedReservation] = useState(null);

  // Canvas de Firma Digital
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Estado del Panel de Administración
  const [adminTab, setAdminTab] = useState('reservations'); // 'reservations' | 'excel' | 'tours'
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [copiedExcelAll, setCopiedExcelAll] = useState(false);

  // Modales del Administrador
  const [selectedReservationModal, setSelectedReservationModal] = useState(null);
  const [emailModalReservation, setEmailModalReservation] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [contractViewReservation, setContractViewReservation] = useState(null);

  // Modal de Crear / Editar Tour (incluye precio normal y precio cliente)
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [editingTour, setEditingTour] = useState(null);
  const [tourForm, setTourForm] = useState({
    title: '',
    destination: '',
    date: '',
    duration: '1 día (Ida y vuelta)',
    price: '',
    client_price: '',
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

  // Sincronizar campos de nombre por asiento al cambiar número de asientos
  const handleSeatsChange = (newSeats) => {
    const count = Math.max(1, Number(newSeats) || 1);
    setSeatsCount(count);
    setClientForm((prev) => {
      const nextNames = [...(prev.seatNamesList || [])];
      while (nextNames.length < count) nextNames.push('');
      return { ...prev, seatNamesList: nextNames.slice(0, count) };
    });
  };

  // Sincronizar edades de niños al cambiar cantidad
  const handleChildrenCountChange = (newCount) => {
    const count = Math.max(1, Number(newCount) || 1);
    setChildrenCount(count);
    setChildrenAges((prev) => {
      const next = [...prev];
      while (next.length < count) next.push('');
      return next.slice(0, count);
    });
  };

  // Aplicar código preferencial / cliente
  const handleApplyPromoCode = () => {
    const codeKey = promoInput.trim().toUpperCase();
    if (!codeKey) {
      setAppliedCode(null);
      setPromoFeedback('Escribe un código para verificar.');
      return;
    }
    const found = VALID_CODES[codeKey];
    if (!found) {
      setAppliedCode(null);
      setPromoFeedback('Código no válido. Se aplicará el precio normal.');
      return;
    }
    setAppliedCode({ code: codeKey, ...found });
    setPromoFeedback(`Código "${codeKey}" aplicado (${found.label}).`);
  };

  // Cálculo de tarifas (Precio normal público vs precio de cliente/niño con código)
  const getPricingSummary = () => {
    if (!selectedTour) {
      return {
        unitPrice: 0,
        childSeatPrice: 0,
        paidChildrenCount: 0,
        lapChildrenCount: 0,
        totalAmount: 0,
        depositAmount: 0
      };
    }

    const normalPrice = Number(selectedTour.price) || 0;
    const baseClientPrice =
      Number(selectedTour.client_price) > 0
        ? Number(selectedTour.client_price)
        : normalPrice;

    let unitPrice = normalPrice;
    if (appliedCode) {
      unitPrice =
        typeof appliedCode.discountRate === 'number'
          ? Math.round(baseClientPrice * (1 - appliedCode.discountRate))
          : baseClientPrice;
    }

    let paidChildrenCount = 0;
    let lapChildrenCount = 0;

    if (hasChildren) {
      childrenAges.slice(0, childrenCount).forEach((ageStr) => {
        const age = Number(ageStr);
        if (!Number.isNaN(age) && ageStr !== '') {
          if (age <= 3) {
            lapChildrenCount += 1;
          } else if (age <= 10) {
            paidChildrenCount += 1;
          }
        }
      });
    }

    const adultOrStandardSeats = Math.max(0, Number(seatsCount) - paidChildrenCount);
    const childrenSeatRate = appliedCode ? unitPrice : baseClientPrice;

    const totalAmount =
      adultOrStandardSeats * unitPrice + paidChildrenCount * childrenSeatRate;

    const depositPerSeat = Number(selectedTour.deposit) || 0;
    const depositAmount = depositPerSeat * Number(seatsCount);

    return {
      unitPrice,
      childSeatPrice: childrenSeatRate,
      paidChildrenCount,
      lapChildrenCount,
      totalAmount,
      depositAmount
    };
  };

  const pricing = getPricingSummary();

  // Copiar datos bancarios
  const copyBankText = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedBankField(label);
      setTimeout(() => setCopiedBankField(''), 2200);
    } catch {
      setCopiedBankField('');
    }
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
      ctx.strokeStyle = '#111111';
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

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(filePath, receiptFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir comprobante: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(filePath);

      const receiptUrl = publicUrlData.publicUrl;
      const signatureData = canvasRef.current.toDataURL('image/png');

      const formattedSeatNames = clientForm.seatNamesList
        .map((n, idx) => `Asiento ${idx + 1}: ${n.trim() || 'Por asignar'}`)
        .join(' | ');

      const formattedChildren = hasChildren
        ? `${childrenCount} niño(a)(s) — Edades: ${childrenAges
            .slice(0, childrenCount)
            .map((a) => `${a || '?'} años`)
            .join(', ')} (Hasta 10 años en asiento = precio cliente; hasta 3 años en piernas sin costo, sin entradas)`
        : 'No viajan niños';

      const idCheck = validateCurpOrIne(clientForm.idNumber, clientForm.name);

      const payload = {
        folio,
        tour_id: selectedTour.id,
        tour_title: selectedTour.title,
        tour_date: selectedTour.date,
        passengers: Number(seatsCount),
        total_amount: pricing.totalAmount,
        deposit_amount: pricing.depositAmount,
        client_name: clientForm.name.trim(),
        client_email: clientForm.email.trim(),
        client_phone: clientForm.phone.trim(),
        client_id_number: idCheck.normalized || clientForm.idNumber.trim().toUpperCase(),
        companions: formattedSeatNames,
        seat_names: formattedSeatNames,
        emergency_contact: clientForm.emergencyContact.trim(),
        children_info: formattedChildren,
        promo_code_used: appliedCode ? appliedCode.code : 'PRECIO NORMAL',
        applied_unit_price: pricing.unitPrice,
        receipt_url: receiptUrl,
        signature_data: signatureData,
        status: 'pending',
        email_sent: false,
        user_agent: navigator.userAgent
      };

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
  // ACCIONES DE ADMINISTRADOR: RESERVACIONES, EXCEL Y CORREO
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

  const handleCopyAllForExcel = async () => {
    const headers = [
      'Folio',
      'Fecha Registro',
      'Viaje',
      'Fecha Salida',
      'Titular',
      'Teléfono WhatsApp',
      'Contacto Emergencia',
      'Correo Electrónico',
      'CURP / INE',
      'No. Asientos',
      'Nombres por Asiento',
      'Niños y Edades',
      'Código Aplicado',
      'Total ($ MXN)',
      'Anticipo ($ MXN)',
      'Saldo ($ MXN)',
      'Estado'
    ];

    const rows = filteredReservations.map((r) => {
      const balance = Number(r.total_amount || 0) - Number(r.deposit_amount || 0);
      return [
        r.folio || '',
        r.created_at ? new Date(r.created_at).toLocaleDateString('es-MX') : '',
        r.tour_title || '',
        r.tour_date || '',
        r.client_name || '',
        r.client_phone || '',
        r.emergency_contact || '',
        r.client_email || '',
        r.client_id_number || '',
        r.passengers || 0,
        r.seat_names || r.companions || '',
        r.children_info || 'No viajan niños',
        r.promo_code_used || 'PRECIO NORMAL',
        r.total_amount || 0,
        r.deposit_amount || 0,
        balance,
        r.status || 'pending'
      ]
        .map((cell) => String(cell).replace(/\t|\n|\r/g, ' '))
        .join('\t');
    });

    const tsv = [headers.join('\t'), ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiedExcelAll(true);
      setTimeout(() => setCopiedExcelAll(false), 2500);
    } catch {
      setCopiedExcelAll(false);
    }
  };

  const buildConfirmationEmail = (res) => {
    const pendingBalance = Number(res.total_amount) - Number(res.deposit_amount);
    const subject = `Confirmación de Reservación - Folio ${res.folio} | ${AGENCY_INFO.name}`;
    const body = `Hola ${res.client_name},

¡Gracias por viajar con ${AGENCY_INFO.name}! (${AGENCY_INFO.slogan}). Una vez verificada tu información y comprobante de pago, aquí tienes los datos registrados de tu reservación:

DETALLES DE TU RESERVACIÓN
----------------------------------------
• Folio de Contrato: ${res.folio}
• Viaje / Destino: ${res.tour_title}
• Fecha de Salida: ${res.tour_date}
• Número de Asientos: ${res.passengers}
• Nombres por Asiento: ${res.seat_names || res.companions || 'Registrados'}
• Niños: ${res.children_info || 'No viajan niños'}
• Contacto de Emergencia: ${res.emergency_contact || 'Registrado'}
• Código Aplicado: ${res.promo_code_used || 'PRECIO NORMAL'}

RESUMEN DE PAGO
----------------------------------------
• Total Calculado: $${Number(res.total_amount).toLocaleString('es-MX')} MXN
• Anticipo Reportado: $${Number(res.deposit_amount).toLocaleString('es-MX')} MXN
• Saldo Pendiente: $${pendingBalance.toLocaleString('es-MX')} MXN

Para cualquier duda o seguimiento, contáctanos por llamada o WhatsApp al ${AGENCY_INFO.phone} o al correo ${AGENCY_INFO.email}.

¡Saludos cordiales!
${AGENCY_INFO.name} (RNT: ${AGENCY_INFO.rnt})`;

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
      client_price: '',
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
      client_price: tour.client_price ?? tour.price,
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

    const normalPriceNum = Number(tourForm.price);
    const clientPriceNum =
      tourForm.client_price !== '' && !Number.isNaN(Number(tourForm.client_price))
        ? Number(tourForm.client_price)
        : normalPriceNum;

    const tourPayload = {
      title: tourForm.title.trim(),
      destination: tourForm.destination.trim(),
      date: tourForm.date.trim(),
      duration: tourForm.duration.trim(),
      price: normalPriceNum,
      client_price: clientPriceNum,
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
    emergencyContact,
    clientEmail,
    seatNamesText,
    childrenText,
    promoUsed,
    tourTitle,
    tourDate,
    seatsCountVal,
    total,
    deposit,
    signatureImg,
    userAgentStr
  }) => (
    <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 text-[#111111] text-xs sm:text-sm leading-relaxed space-y-4 shadow-sm print:shadow-none print:border-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <img
            src={AGENCY_INFO.logoSrc}
            alt={AGENCY_INFO.name}
            className="h-14 w-auto object-contain rounded-lg bg-white p-1 border border-slate-200"
          />
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#1F4FBE] uppercase tracking-wide">
              Contrato de Prestación de Servicios Turísticos
            </h3>
            <p className="text-[#5A6470] text-xs">
              {AGENCY_INFO.name} • RNT: {AGENCY_INFO.rnt} • {AGENCY_INFO.address}
            </p>
            <p className="text-[#5A6470] text-xs">
              Tel / WhatsApp: {AGENCY_INFO.phone} • Correo: {AGENCY_INFO.email}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <span className="inline-block bg-[#EAF6FD] text-[#1F4FBE] font-mono font-bold px-3 py-1 rounded-lg text-xs border border-[#5AB4E6]/40">
            FOLIO: {folio}
          </span>
          <p className="text-[#5A6470] text-xs mt-1">Fecha: {dateStr}</p>
        </div>
      </div>

      <p>
        <strong>PARTES:</strong> Celebran el presente contrato por una parte{' '}
        <strong>{AGENCY_INFO.name}</strong> (en adelante &ldquo;LA AGENCIA&rdquo;) y por la
        otra <strong>{clientName || '[NOMBRE DEL TITULAR]'}</strong>, con identificador{' '}
        <strong>{clientId || '[CURP / CLAVE DE ELECTOR INE]'}</strong>, teléfono para grupo de
        WhatsApp <strong>{clientPhone || '[TELÉFONO]'}</strong>, contacto de emergencia{' '}
        <strong>{emergencyContact || '[CONTACTO DE EMERGENCIA]'}</strong> y correo electrónico{' '}
        <strong>{clientEmail || '[CORREO]'}</strong> (en adelante &ldquo;EL CLIENTE&rdquo;).
      </p>

      <div className="bg-[#F4F6F8] p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[#5A6470] block">Servicio / Tour Contratado:</span>
          <strong className="text-[#111111]">{tourTitle}</strong>
        </div>
        <div>
          <span className="text-[#5A6470] block">Fecha de Salida Programada:</span>
          <strong className="text-[#111111]">{tourDate}</strong>
        </div>
        <div>
          <span className="text-[#5A6470] block">No. de Asientos:</span>
          <strong className="text-[#111111]">{seatsCountVal} asiento(s)</strong>
        </div>
        <div>
          <span className="text-[#5A6470] block">Tarifa / Código Aplicado:</span>
          <strong className="text-[#1F4FBE]">{promoUsed || 'PRECIO NORMAL'}</strong>
        </div>
        <div className="sm:col-span-2">
          <span className="text-[#5A6470] block">Nombre por Asiento:</span>
          <strong className="text-[#111111]">{seatNamesText || 'Por asignar'}</strong>
        </div>
        <div className="sm:col-span-2">
          <span className="text-[#5A6470] block">Detalle de Niños:</span>
          <strong className="text-[#111111]">{childrenText || 'No viajan niños'}</strong>
        </div>
        <div>
          <span className="text-[#5A6470] block">Total / Anticipo Reportado:</span>
          <strong className="text-[#111111]">
            ${Number(total).toLocaleString('es-MX')} MXN / Anticipo: $
            {Number(deposit).toLocaleString('es-MX')} MXN
          </strong>
        </div>
        <div>
          <span className="text-[#5A6470] block">Saldo Pendiente a Liquidar:</span>
          <strong className="text-[#2E9E5B]">
            ${(Number(total) - Number(deposit)).toLocaleString('es-MX')} MXN
          </strong>
        </div>
      </div>

      <div className="space-y-2 text-xs text-[#111111]">
        <p>
          <strong>PRIMERA (OBJETO):</strong> LA AGENCIA prestará los servicios turísticos
          correspondientes al viaje seleccionado, con salida desde Tehuacán, Puebla.
        </p>
        <p>
          <strong>SEGUNDA (PAGOS Y MENORES):</strong> El apartado queda sujeto a validación del
          comprobante de pago. Los niños de hasta 10 años ocupando asiento pagan tarifa de
          cliente; los niños de hasta 3 años viajando en piernas no pagan y no incluyen costos de
          entradas. El saldo restante deberá liquidarse antes de abordar.
        </p>
        <p>
          <strong>TERCERA (CANCELACIONES Y PUNTUALIDAD):</strong> Los anticipos no son
          reembolsables ante cancelaciones o inasistencia a la hora de salida programada.
        </p>
        <p>
          <strong>CUARTA (FIRMA ELECTRÓNICA - ART. 89 CÓDIGO DE COMERCIO):</strong> La firma
          autógrafa digitalizada en este documento electrónico produce plena validez y fuerza
          obligatoria conforme a los artículos 89 y 93 del Código de Comercio y 1803 del Código
          Civil Federal.
        </p>
      </div>

      {signatureImg && (
        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          <div className="text-center">
            <div className="h-20 flex items-center justify-center border-b border-slate-400 mb-1">
              <span className="font-serif italic text-lg text-[#1F4FBE]">
                {AGENCY_INFO.name}
              </span>
            </div>
            <p className="text-xs font-semibold text-[#111111]">POR LA AGENCIA</p>
            <p className="text-[11px] text-[#5A6470]">RNT: {AGENCY_INFO.rnt}</p>
          </div>
          <div className="text-center">
            <div className="h-20 flex items-center justify-center border-b border-slate-400 mb-1">
              <img
                src={signatureImg}
                alt="Firma del Cliente"
                className="max-h-16 object-contain"
              />
            </div>
            <p className="text-xs font-semibold text-[#111111]">
              {clientName} ({clientId})
            </p>
            <p className="text-[11px] text-[#5A6470]">
              Firma Electrónica Autógrafa del Titular
            </p>
          </div>
        </div>
      )}

      {signatureImg && (
        <div className="bg-[#F4F6F8] p-3 rounded-xl text-[11px] text-[#5A6470] font-mono break-all">
          <strong>SELLO DE AUDITORÍA DIGITAL:</strong> Folio {folio} • Fecha: {dateStr} •
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
    <div className="min-h-screen bg-[#F4F6F8] text-[#111111] font-sans flex flex-col">
      {/* ====================================================================
          BARRA SUPERIOR DE NAVEGACIÓN (SIN BOTÓN DE AGENCIA ARRIBA)
         ==================================================================== */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div
            onClick={() => {
              setView('client');
              setStep(1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <img
              src={AGENCY_INFO.logoSrc}
              alt={AGENCY_INFO.name}
              className="h-12 sm:h-14 w-auto object-contain rounded-lg"
            />
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-[#1F4FBE] leading-tight">
                ¡Acompáñanos a tu próxima aventura!
              </p>
              <p className="text-[11px] text-[#5A6470]">
                WhatsApp {AGENCY_INFO.phone} • RNT {AGENCY_INFO.rnt}
              </p>
            </div>
          </div>

          {view === 'admin' && (
            <button
              onClick={() => setView('client')}
              className="flex items-center gap-1.5 text-xs bg-[#F58220] hover:bg-[#e07314] text-white px-3.5 py-2 rounded-xl font-bold transition shadow-sm"
            >
              <span>Ver Vista Cliente</span>
            </button>
          )}
        </div>
      </header>

      {/* ====================================================================
          VISTA PÚBLICA PARA CLIENTES
         ==================================================================== */}
      {view === 'client' && (
        <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10 flex-1 w-full">
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
                            ? 'bg-[#1F4FBE] text-white shadow-sm'
                            : 'bg-slate-200 text-[#5A6470]'
                        }`}
                      >
                        {step > item.num ? <Check className="w-5 h-5" /> : item.num}
                      </div>
                      <span
                        className={`text-xs mt-1.5 font-semibold ${
                          step >= item.num ? 'text-[#1F4FBE]' : 'text-[#5A6470]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {idx < 2 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded-full ${
                          step > item.num ? 'bg-[#5AB4E6]' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* PASO 1: CATÁLOGO DE TOURS (SOLO PRECIO NORMAL PÚBLICO, SIN LUGARES DISP.) */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#EAF6FD] via-white to-[#EAF6FD] border border-[#5AB4E6]/40 rounded-3xl p-6 sm:p-8 text-center">
                <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#1F4FBE] bg-white px-3.5 py-1 rounded-full border border-[#5AB4E6]/40 mb-2">
                  {AGENCY_INFO.slogan}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F4FBE] uppercase tracking-tight">
                  ¡Acompáñanos en Nuestros Próximos Viajes!
                </h2>
                <p className="text-[#5A6470] text-sm mt-1.5 max-w-xl mx-auto">
                  Lánzate con nosotros: elige tu viaje, aparta con tu comprobante y firma tu
                  contrato digital en minutos.
                </p>
              </div>

              {loadingTours ? (
                <div className="flex flex-col items-center justify-center py-16 text-[#5A6470]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1F4FBE] mb-2" />
                  <p className="text-sm">Cargando viajes disponibles...</p>
                </div>
              ) : activeTours.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
                  <h3 className="font-bold text-[#1F4FBE] text-lg">
                    Pronto publicaremos nuevas salidas
                  </h3>
                  <p className="text-[#5A6470] text-sm mt-1">
                    Estamos preparando nuevos destinos desde Tehuacán.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeTours.map((tour) => (
                    <div
                      key={tour.id}
                      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                    >
                      <div className="relative h-52 bg-slate-200">
                        <img
                          src={
                            tour.image ||
                            'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=900&q=80'
                          }
                          alt={tour.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 bg-[#1F4FBE] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                          {tour.duration}
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-[#5A6470] font-semibold mb-1">
                            <Calendar className="w-3.5 h-3.5 text-[#1F4FBE]" />
                            <span>{tour.date}</span>
                          </div>
                          <h3 className="text-lg font-extrabold text-[#1F4FBE] uppercase">
                            {tour.title}
                          </h3>
                          <p className="text-xs text-[#5A6470] flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-[#5AB4E6]" /> {tour.destination}
                          </p>

                          {Array.isArray(tour.includes) && tour.includes.length > 0 && (
                            <ul className="mt-3 space-y-1">
                              {tour.includes.slice(0, 3).map((inc, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-[#111111] flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2E9E5B] shrink-0" />
                                  <span>{inc}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                          <div className="bg-[#F58220]/10 border border-[#F58220]/30 rounded-2xl px-3.5 py-2">
                            <span className="text-[11px] text-[#5A6470] font-semibold block">
                              Precio normal por persona
                            </span>
                            <span className="text-xl font-black text-[#F58220]">
                              ${Number(tour.price).toLocaleString('es-MX')}{' '}
                              <span className="text-xs font-semibold text-[#111111]">MXN</span>
                            </span>
                            <span className="text-[11px] text-[#2E9E5B] font-semibold block">
                              Anticipo: ${Number(tour.deposit).toLocaleString('es-MX')} MXN por
                              asiento
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedTour(tour);
                              setSeatsCount(1);
                              setAppliedCode(null);
                              setPromoInput('');
                              setPromoFeedback('');
                              setClientForm((prev) => ({ ...prev, seatNamesList: [''] }));
                              setStep(2);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="bg-[#F58220] hover:bg-[#e07314] text-white font-bold text-sm px-5 py-3 rounded-2xl flex items-center gap-1.5 transition shadow-sm shrink-0"
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

          {/* PASO 2: DATOS COMPLETOS, CÓDIGO PREFERENCIAL, NIÑOS Y COMPROBANTE */}
          {step === 2 && selectedTour && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-extrabold text-[#F58220] uppercase">
                    Paso 2 de 3
                  </span>
                  <h2 className="text-xl font-extrabold text-[#1F4FBE] uppercase">
                    Datos de Reservación y Comprobante
                  </h2>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-[#5A6470] hover:text-[#1F4FBE] font-semibold flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Cambiar viaje
                </button>
              </div>

              {/* Viaje elegido + No. de asientos */}
              <div className="bg-[#EAF6FD] border border-[#5AB4E6]/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-[#1F4FBE]">{selectedTour.title}</h3>
                  <p className="text-xs text-[#5A6470]">
                    {selectedTour.destination} • Salida: {selectedTour.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-[#111111]">
                    No. de asientos:
                  </label>
                  <select
                    value={seatsCount}
                    onChange={(e) => handleSeatsChange(Number(e.target.value))}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-[#111111]"
                  >
                    {[...Array(20)].map((_, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} {idx === 0 ? 'asiento' : 'asientos'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Código especial / preferencial (oculta precio cliente hasta validar código) */}
              <div className="bg-[#F4F6F8] border border-slate-200 rounded-2xl p-4 space-y-2">
                <label className="text-xs font-bold text-[#1F4FBE] flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-[#F58220]" />
                  ¿Cuentas con código especial o preferencial para clientes?
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Ingresa tu código (opcional)"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs uppercase outline-none focus:ring-2 focus:ring-[#1F4FBE]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    className="bg-[#1F4FBE] hover:bg-[#173d96] text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                  >
                    Aplicar código
                  </button>
                </div>
                {promoFeedback && (
                  <p
                    className={`text-xs font-semibold ${
                      appliedCode ? 'text-[#2E9E5B]' : 'text-[#5A6470]'
                    }`}
                  >
                    {promoFeedback}
                  </p>
                )}
              </div>

              {/* Resumen de importes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1F4FBE] text-white p-4 rounded-2xl">
                <div>
                  <span className="text-xs text-[#EAF6FD] block">
                    Total ({seatsCount} asiento{seatsCount > 1 ? 's' : ''})
                  </span>
                  <span className="text-lg font-extrabold">
                    ${pricing.totalAmount.toLocaleString('es-MX')} MXN
                  </span>
                </div>
                <div className="bg-[#F58220] rounded-xl p-3">
                  <span className="text-xs text-white/95 font-semibold block">
                    Anticipo a Depositar
                  </span>
                  <span className="text-xl font-black text-white">
                    ${pricing.depositAmount.toLocaleString('es-MX')} MXN
                  </span>
                </div>
              </div>

              {/* Cuentas BANORTE con botón copiar */}
              <div className="bg-[#F4F6F8] border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5">
                <p className="font-bold text-[#111111] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#1F4FBE]" />
                  Cuenta Bancaria {AGENCY_INFO.bank} — Titular: {AGENCY_INFO.holder}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#5A6470] block">Cuenta CLABE</span>
                      <strong className="font-mono text-[#111111] text-[11px] break-all">
                        {AGENCY_INFO.clabe}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyBankText('clabe', AGENCY_INFO.clabe)}
                      className="shrink-0 bg-[#EAF6FD] hover:bg-[#d8effc] text-[#1F4FBE] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      {copiedBankField === 'clabe' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#2E9E5B]" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#5A6470] block">No. de Tarjeta</span>
                      <strong className="font-mono text-[#111111] text-[11px] break-all">
                        {AGENCY_INFO.card}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyBankText('card', AGENCY_INFO.card)}
                      className="shrink-0 bg-[#EAF6FD] hover:bg-[#d8effc] text-[#1F4FBE] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      {copiedBankField === 'card' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#2E9E5B]" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#5A6470] block">
                        Cajero / Cuenta Banorte
                      </span>
                      <strong className="font-mono text-[#111111] text-[11px] break-all">
                        {AGENCY_INFO.accountNumber}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyBankText('account', AGENCY_INFO.accountNumber)}
                      className="shrink-0 bg-[#EAF6FD] hover:bg-[#d8effc] text-[#1F4FBE] px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                    >
                      {copiedBankField === 'account' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#2E9E5B]" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Formulario de datos requeridos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Titular *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre completo del titular"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#1F4FBE] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Número de Teléfono (para grupo de WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="238 000 0000"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#1F4FBE] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Contacto de emergencia (persona que NO asiste al viaje) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre y teléfono de contacto externo"
                    value={clientForm.emergencyContact}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, emergencyContact: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#1F4FBE] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    CURP o Clave de Elector (INE) del Titular *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="18 caracteres (CURP o Clave de Elector)"
                    value={clientForm.idNumber}
                    onChange={(e) => setClientForm({ ...clientForm, idNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm uppercase focus:ring-2 focus:ring-[#1F4FBE] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Correo electrónico (para recibir confirmación) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#1F4FBE] outline-none"
                  />
                  <p className="text-[11px] text-[#5A6470] mt-1">
                    Después de enviada tu reservación, verificaremos todo y recibirás tu
                    confirmación en este correo.
                  </p>
                </div>

                {/* Nombre de cada persona por asiento */}
                <div className="sm:col-span-2 bg-[#F4F6F8] border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <label className="block text-xs font-bold text-[#1F4FBE]">
                    Nombre de cada persona por asiento ({seatsCount}) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {clientForm.seatNamesList.map((seatName, idx) => (
                      <div key={idx}>
                        <span className="text-[11px] text-[#5A6470] block mb-0.5">
                          Asiento {idx + 1}
                        </span>
                        <input
                          type="text"
                          required
                          placeholder={`Nombre de pasajero en asiento ${idx + 1}`}
                          value={seatName}
                          onChange={(e) => {
                            const updated = [...clientForm.seatNamesList];
                            updated[idx] = e.target.value;
                            setClientForm({ ...clientForm, seatNamesList: updated });
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#1F4FBE]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sección de Niños */}
                <div className="sm:col-span-2 bg-[#F4F6F8] border border-slate-200 rounded-2xl p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasChildren}
                      onChange={(e) => setHasChildren(e.target.checked)}
                      className="w-4 h-4 accent-[#1F4FBE]"
                    />
                    <span className="text-xs font-bold text-[#111111]">
                      ¿Viajan niños?
                    </span>
                  </label>
                  <p className="text-[11px] text-[#5A6470]">
                    Niños hasta 10 años ocupando asiento pagan tarifa de cliente. Niños hasta 3
                    años viajando en piernas no pagan (no se incluyen costos de entradas).
                  </p>

                  {hasChildren && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-[#111111]">
                          ¿Cuántos niños?
                        </label>
                        <select
                          value={childrenCount}
                          onChange={(e) => handleChildrenCountChange(Number(e.target.value))}
                          className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold"
                        >
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'niño(a)' : 'niños(as)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {childrenAges.slice(0, childrenCount).map((age, idx) => (
                          <div key={idx}>
                            <span className="text-[11px] text-[#5A6470] block mb-0.5">
                              Edad niño/a {idx + 1} (años)
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="17"
                              required
                              placeholder="Ej. 5"
                              value={age}
                              onChange={(e) => {
                                const next = [...childrenAges];
                                next[idx] = e.target.value;
                                setChildrenAges(next);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#1F4FBE]"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Carga de Comprobante */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#111111] mb-1.5">
                    Comprobante de depósito o transferencia *
                  </label>
                  <label className="border-2 border-dashed border-slate-300 hover:border-[#1F4FBE] rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-[#F4F6F8] transition">
                    {receiptPreview ? (
                      <div className="text-center space-y-2">
                        <img
                          src={receiptPreview}
                          alt="Vista previa comprobante"
                          className="max-h-44 mx-auto rounded-xl shadow-sm"
                        />
                        <span className="text-xs text-[#2E9E5B] font-bold block">
                          Comprobante cargado ({receiptFile?.name}) — Clic para cambiar
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-[#1F4FBE] mb-2" />
                        <span className="text-sm font-bold text-[#111111]">
                          Toca aquí para seleccionar la imagen de tu comprobante
                        </span>
                        <span className="text-xs text-[#5A6470] mt-0.5">
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
                <div className="bg-red-50 border border-red-200 text-[#D92D20] text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (
                      !clientForm.name.trim() ||
                      !clientForm.phone.trim() ||
                      !clientForm.emergencyContact.trim() ||
                      !clientForm.email.includes('@')
                    ) {
                      setSubmitError(
                        'Completa titular, teléfono de WhatsApp, contacto de emergencia y correo electrónico válido.'
                      );
                      return;
                    }

                    const idValidation = validateCurpOrIne(
                      clientForm.idNumber,
                      clientForm.name
                    );
                    if (!idValidation.valid) {
                      setSubmitError(idValidation.message);
                      return;
                    }

                    const allSeatsNamed = clientForm.seatNamesList
                      .slice(0, seatsCount)
                      .every((n) => n.trim().length > 0);
                    if (!allSeatsNamed) {
                      setSubmitError('Escribe el nombre de cada persona por asiento.');
                      return;
                    }

                    if (hasChildren) {
                      const allAgesValid = childrenAges
                        .slice(0, childrenCount)
                        .every((a) => a !== '' && Number(a) >= 0 && Number(a) < 18);
                      if (!allAgesValid) {
                        setSubmitError('Indica la edad de cada niño(a) que viaja.');
                        return;
                      }
                    }

                    if (!receiptFile) {
                      setSubmitError('Adjunta la imagen de tu comprobante de pago.');
                      return;
                    }

                    setSubmitError('');
                    setStep(3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-[#F58220] hover:bg-[#e07314] text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-sm"
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
                  <span className="text-xs font-extrabold text-[#F58220] uppercase">
                    Paso 3 de 3
                  </span>
                  <h2 className="text-xl font-extrabold text-[#1F4FBE] uppercase">
                    Revisa tu Contrato y Firma Digitalmente
                  </h2>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-[#5A6470] hover:text-[#1F4FBE] font-semibold flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Editar datos
                </button>
              </div>

              {renderLegalContractDocument({
                folio: 'VISTA PREVIA',
                dateStr: new Date().toLocaleDateString('es-MX'),
                clientName: clientForm.name,
                clientId: clientForm.idNumber.trim().toUpperCase(),
                clientPhone: clientForm.phone,
                emergencyContact: clientForm.emergencyContact,
                clientEmail: clientForm.email,
                seatNamesText: clientForm.seatNamesList
                  .map((n, idx) => `Asiento ${idx + 1}: ${n.trim()}`)
                  .join(' | '),
                childrenText: hasChildren
                  ? `${childrenCount} niño(a)(s) — Edades: ${childrenAges
                      .slice(0, childrenCount)
                      .map((a) => `${a} años`)
                      .join(', ')}`
                  : 'No viajan niños',
                promoUsed: appliedCode ? appliedCode.code : 'PRECIO NORMAL',
                tourTitle: selectedTour.title,
                tourDate: selectedTour.date,
                seatsCountVal: seatsCount,
                total: pricing.totalAmount,
                deposit: pricing.depositAmount,
                signatureImg: null
              })}

              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-[#111111]">
                    Firma Autógrafa del Titular (dedo o mouse) *
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs text-[#D92D20] hover:underline font-semibold"
                  >
                    Limpiar firma
                  </button>
                </div>

                <div className="border-2 border-slate-300 rounded-2xl bg-[#F4F6F8] overflow-hidden touch-none">
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
                    className="mt-1 w-4 h-4 accent-[#1F4FBE]"
                  />
                  <span className="text-xs text-[#111111] leading-relaxed">
                    Acepto los términos del Contrato de Prestación de Servicios Turísticos y el
                    uso de mi firma electrónica autógrafa conforme al Art. 89 del Código de
                    Comercio. Entiendo que tras enviar se verificará todo y recibiré la
                    confirmación en mi correo electrónico.
                  </span>
                </label>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-[#D92D20] text-xs p-3 rounded-xl flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <button
                  onClick={handleFinalizeReservation}
                  disabled={submitting}
                  className="w-full bg-[#F58220] hover:bg-[#e07314] disabled:bg-slate-400 text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Guardando contrato y comprobante...</span>
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
              <div className="bg-[#2E9E5B] text-white rounded-3xl p-6 sm:p-8 text-center space-y-2 shadow-md print:hidden">
                <CheckCircle2 className="w-12 h-12 mx-auto text-white/90" />
                <h2 className="text-2xl font-extrabold">¡Reservación Enviada!</h2>
                <p className="text-sm text-white/95 max-w-xl mx-auto">
                  Folio <strong>{completedReservation.folio}</strong>. Después de enviado, se va
                  a verificar todo y recibirás tu confirmación en el correo{' '}
                  <strong>{completedReservation.client_email}</strong>.
                </p>
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => window.print()}
                    className="bg-white text-[#1F4FBE] hover:bg-[#EAF6FD] font-bold text-sm px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm transition"
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
                    className="bg-[#1F4FBE] hover:bg-[#173d96] text-white text-sm font-bold px-5 py-2.5 rounded-2xl transition"
                  >
                    Hacer otra reservación
                  </button>
                </div>
              </div>

              {renderLegalContractDocument({
                folio: completedReservation.folio,
                dateStr: new Date(completedReservation.created_at).toLocaleString('es-MX'),
                clientName: completedReservation.client_name,
                clientId: completedReservation.client_id_number,
                clientPhone: completedReservation.client_phone,
                emergencyContact: completedReservation.emergency_contact,
                clientEmail: completedReservation.client_email,
                seatNamesText: completedReservation.seat_names,
                childrenText: completedReservation.children_info,
                promoUsed: completedReservation.promo_code_used,
                tourTitle: completedReservation.tour_title,
                tourDate: completedReservation.tour_date,
                seatsCountVal: completedReservation.passengers,
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
        <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
          {!session ? (
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#EAF6FD] text-[#1F4FBE] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold text-[#1F4FBE]">
                  Panel Privado de Agencia
                </h2>
                <p className="text-xs text-[#5A6470] mt-1">
                  Inicia sesión con tu cuenta autorizada de {AGENCY_INFO.name}
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Correo de Administrador
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder={AGENCY_INFO.email}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1F4FBE]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1F4FBE]"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-[#D92D20] bg-red-50 border border-red-200 p-2.5 rounded-xl">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#1F4FBE] hover:bg-[#173d96] text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition"
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
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1F4FBE]">
                    Control de Reservaciones y Tours
                  </h2>
                  <p className="text-xs text-[#5A6470]">
                    Conectado como: <strong>{session.user.email}</strong>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAdminTab('reservations')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      adminTab === 'reservations'
                        ? 'bg-[#1F4FBE] text-white'
                        : 'bg-[#F4F6F8] text-[#111111] hover:bg-slate-200'
                    }`}
                  >
                    Reservaciones ({reservations.length})
                  </button>
                  <button
                    onClick={() => setAdminTab('excel')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      adminTab === 'excel'
                        ? 'bg-[#1F4FBE] text-white'
                        : 'bg-[#F4F6F8] text-[#111111] hover:bg-slate-200'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" /> Tabla para Excel
                  </button>
                  <button
                    onClick={() => setAdminTab('tours')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      adminTab === 'tours'
                        ? 'bg-[#1F4FBE] text-white'
                        : 'bg-[#F4F6F8] text-[#111111] hover:bg-slate-200'
                    }`}
                  >
                    Catálogo de Tours ({tours.length})
                  </button>
                  <button
                    onClick={handleAdminLogout}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-[#D92D20] hover:bg-red-100 flex items-center gap-1"
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
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            statusFilter === tab.id
                              ? 'bg-[#1F4FBE] text-white border-[#1F4FBE]'
                              : 'bg-white text-[#5A6470] border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={fetchReservations}
                      className="text-xs text-[#1F4FBE] font-bold hover:underline"
                    >
                      Actualizar lista
                    </button>
                  </div>

                  {loadingReservations ? (
                    <div className="text-center py-12 text-[#5A6470]">
                      <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#1F4FBE] mb-2" />
                      <p className="text-xs">Cargando reservaciones...</p>
                    </div>
                  ) : filteredReservations.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-[#5A6470] text-sm">
                      No hay reservaciones en esta categoría todavía.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredReservations.map((res) => (
                        <div
                          key={res.id}
                          className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold bg-[#EAF6FD] px-2.5 py-1 rounded-lg text-[#1F4FBE]">
                                {res.folio}
                              </span>
                              <h3 className="font-bold text-[#111111] text-base mt-1.5">
                                {res.client_name}
                              </h3>
                              <p className="text-xs text-[#5A6470]">
                                {res.client_email} • WhatsApp: {res.client_phone}
                              </p>
                              <p className="text-xs text-[#5A6470]">
                                Emergencia: {res.emergency_contact || '—'} • ID:{' '}
                                {res.client_id_number}
                              </p>
                            </div>

                            <div className="text-right space-y-1">
                              <span
                                className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                  res.status === 'verified'
                                    ? 'bg-emerald-100 text-[#2E9E5B]'
                                    : res.status === 'paid'
                                    ? 'bg-[#EAF6FD] text-[#1F4FBE]'
                                    : res.status === 'cancelled'
                                    ? 'bg-red-100 text-[#D92D20]'
                                    : 'bg-amber-100 text-[#F58220]'
                                }`}
                              >
                                {res.status === 'verified'
                                  ? 'Anticipo Verificado'
                                  : res.status === 'paid'
                                  ? 'Liquidado'
                                  : res.status === 'cancelled'
                                  ? 'Cancelado'
                                  : 'Pendiente'}
                              </span>

                              {res.email_sent && (
                                <span className="block text-[10px] font-semibold text-[#2E9E5B]">
                                  ✓ Confirmación enviada
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-[#F4F6F8] p-3 rounded-2xl text-xs space-y-1 border border-slate-100">
                            <p className="font-bold text-[#1F4FBE]">
                              {res.tour_title} ({res.tour_date})
                            </p>
                            <p className="text-[#5A6470]">
                              Asientos: <strong>{res.passengers}</strong> •{' '}
                              {res.seat_names || res.companions || ''}
                            </p>
                            <p className="text-[#5A6470]">
                              Niños: {res.children_info || 'No viajan niños'}
                            </p>
                            <p className="text-[#111111]">
                              Código: <strong>{res.promo_code_used || 'PRECIO NORMAL'}</strong> •
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
                              className="flex-1 bg-[#1F4FBE] hover:bg-[#173d96] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Revisar Depósito</span>
                            </button>

                            <button
                              onClick={() => setEmailModalReservation(res)}
                              className="flex-1 bg-[#F58220] hover:bg-[#e07314] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Enviar Confirmación</span>
                            </button>

                            <button
                              onClick={() => setContractViewReservation(res)}
                              className="bg-[#EAF6FD] hover:bg-[#d8effc] text-[#1F4FBE] text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1"
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

              {/* PESTAÑA 2: TABLA PARA COPIAR Y PEGAR EN EXCEL */}
              {adminTab === 'excel' && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-[#1F4FBE] text-base">
                        Base de Datos Lista para Copiar y Pegar en Excel
                      </h3>
                      <p className="text-xs text-[#5A6470]">
                        Selecciona celdas directamente o usa el botón para copiar toda la tabla
                        separada por columnas y pegarla con <strong>Ctrl + V</strong> en Excel.
                      </p>
                    </div>
                    <button
                      onClick={handleCopyAllForExcel}
                      className="bg-[#2E9E5B] hover:bg-[#25834b] text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shrink-0"
                    >
                      {copiedExcelAll ? (
                        <>
                          <Check className="w-4 h-4" /> Tabla copiada para Excel
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copiar todo para Excel
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="min-w-full text-xs text-left border-collapse">
                      <thead className="bg-[#1F4FBE] text-white">
                        <tr>
                          <th className="p-2.5 border border-[#173d96]">Folio</th>
                          <th className="p-2.5 border border-[#173d96]">Viaje</th>
                          <th className="p-2.5 border border-[#173d96]">Titular</th>
                          <th className="p-2.5 border border-[#173d96]">WhatsApp</th>
                          <th className="p-2.5 border border-[#173d96]">Emergencia</th>
                          <th className="p-2.5 border border-[#173d96]">Correo</th>
                          <th className="p-2.5 border border-[#173d96]">CURP / INE</th>
                          <th className="p-2.5 border border-[#173d96]">Asientos</th>
                          <th className="p-2.5 border border-[#173d96]">Nombres por Asiento</th>
                          <th className="p-2.5 border border-[#173d96]">Niños</th>
                          <th className="p-2.5 border border-[#173d96]">Código</th>
                          <th className="p-2.5 border border-[#173d96]">Total</th>
                          <th className="p-2.5 border border-[#173d96]">Anticipo</th>
                          <th className="p-2.5 border border-[#173d96]">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservations.map((r) => (
                          <tr key={r.id} className="odd:bg-white even:bg-[#F4F6F8]">
                            <td className="p-2 border border-slate-200 font-mono">{r.folio}</td>
                            <td className="p-2 border border-slate-200">{r.tour_title}</td>
                            <td className="p-2 border border-slate-200 font-medium">
                              {r.client_name}
                            </td>
                            <td className="p-2 border border-slate-200">{r.client_phone}</td>
                            <td className="p-2 border border-slate-200">
                              {r.emergency_contact || '—'}
                            </td>
                            <td className="p-2 border border-slate-200">{r.client_email}</td>
                            <td className="p-2 border border-slate-200 font-mono">
                              {r.client_id_number}
                            </td>
                            <td className="p-2 border border-slate-200 text-center">
                              {r.passengers}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {r.seat_names || r.companions || '—'}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {r.children_info || 'No viajan niños'}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {r.promo_code_used || 'PRECIO NORMAL'}
                            </td>
                            <td className="p-2 border border-slate-200">${r.total_amount}</td>
                            <td className="p-2 border border-slate-200">${r.deposit_amount}</td>
                            <td className="p-2 border border-slate-200">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: CATÁLOGO DE TOURS (PRECIO NORMAL + PRECIO CLIENTE) */}
              {adminTab === 'tours' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-[#1F4FBE]">Viajes Publicados</h3>
                    <button
                      onClick={openNewTourModal}
                      className="bg-[#F58220] hover:bg-[#e07314] text-white text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Nuevo Tour
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tours.map((tour) => (
                      <div
                        key={tour.id}
                        className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                tour.active ? 'bg-[#2E9E5B]' : 'bg-slate-300'
                              }`}
                            />
                            <h4 className="font-bold text-[#111111] text-sm">{tour.title}</h4>
                          </div>
                          <p className="text-xs text-[#5A6470] mt-0.5">
                            {tour.date} • Normal: ${Number(tour.price).toLocaleString('es-MX')} •
                            Cliente/Niño: $
                            {Number(tour.client_price ?? tour.price).toLocaleString('es-MX')} •
                            Anticipo: ${Number(tour.deposit).toLocaleString('es-MX')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditTourModal(tour)}
                            className="p-2 bg-[#EAF6FD] hover:bg-[#d8effc] rounded-xl text-[#1F4FBE]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTour(tour.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 rounded-xl text-[#D92D20]"
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
          PIE DE PÁGINA CON DATOS DE TOURS TEHUACÁN Y ACCESO DISCRETO AGENCIA
         ==================================================================== */}
      <footer className="bg-white text-[#111111] border-t border-slate-200 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2">
            <img
              src={AGENCY_INFO.logoSrc}
              alt={AGENCY_INFO.name}
              className="h-14 w-auto object-contain"
            />
            <p className="text-[#5A6470] font-semibold">RNT: {AGENCY_INFO.rnt}</p>
            <p className="text-[#5A6470] leading-relaxed">{AGENCY_INFO.address}</p>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[#1F4FBE] font-extrabold text-sm">Contacto y Redes</h4>
            <p>Llamadas y WhatsApp: {AGENCY_INFO.phone}</p>
            <p>Correo: {AGENCY_INFO.email}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href={AGENCY_INFO.facebookUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#1F4FBE] font-semibold hover:underline inline-flex items-center gap-1"
              >
                Facebook: {AGENCY_INFO.facebookName} <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={AGENCY_INFO.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#1F4FBE] font-semibold hover:underline inline-flex items-center gap-1"
              >
                Instagram: {AGENCY_INFO.instagramHandle} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[#1F4FBE] font-extrabold text-sm">
              Depósitos {AGENCY_INFO.bank}
            </h4>
            <p>Titular: {AGENCY_INFO.holder}</p>
            <p className="font-mono text-[11px]">CLABE: {AGENCY_INFO.clabe}</p>
            <p className="font-mono text-[11px]">Tarjeta: {AGENCY_INFO.card}</p>
            <p className="font-mono text-[11px]">Cajero / Cuenta: {AGENCY_INFO.accountNumber}</p>
          </div>
        </div>

        <div className="bg-[#F4F6F8] border-t border-slate-200 py-3 px-4 max-w-6xl mx-auto flex items-center justify-between text-[11px] text-[#5A6470]">
          <span>
            © {new Date().getFullYear()} {AGENCY_INFO.name} — {AGENCY_INFO.slogan}
          </span>
          <button
            type="button"
            onClick={() => {
              setView('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[#5A6470] hover:text-[#1F4FBE] underline-offset-2 hover:underline transition"
          >
            Agencia
          </button>
        </div>
      </footer>

      {/* ====================================================================
          MODALES DE ADMINISTRACIÓN
         ==================================================================== */}
      {selectedReservationModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-[#1F4FBE]">
                  Comprobante — {selectedReservationModal.folio}
                </h3>
                <p className="text-xs text-[#5A6470]">
                  {selectedReservationModal.client_name} • Anticipo esperado: $
                  {Number(selectedReservationModal.deposit_amount).toLocaleString('es-MX')} MXN
                </p>
              </div>
              <button
                onClick={() => setSelectedReservationModal(null)}
                className="p-1.5 rounded-xl hover:bg-[#F4F6F8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#F4F6F8] rounded-2xl p-2 flex justify-center">
              <img
                src={selectedReservationModal.receipt_url}
                alt="Comprobante de transferencia"
                className="max-h-96 rounded-xl object-contain"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#111111]">
                Actualizar Estado del Pago:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() =>
                    updateReservationStatus(selectedReservationModal.id, 'verified')
                  }
                  className="bg-[#2E9E5B] hover:bg-[#25834b] text-white text-xs font-bold py-2.5 rounded-xl"
                >
                  ✓ Aprobar Anticipo
                </button>
                <button
                  onClick={() => updateReservationStatus(selectedReservationModal.id, 'paid')}
                  className="bg-[#1F4FBE] hover:bg-[#173d96] text-white text-xs font-bold py-2.5 rounded-xl"
                >
                  ★ Marcar Liquidado
                </button>
                <button
                  onClick={() =>
                    updateReservationStatus(selectedReservationModal.id, 'pending')
                  }
                  className="bg-amber-100 hover:bg-amber-200 text-[#F58220] text-xs font-bold py-2 rounded-xl"
                >
                  Dejar Pendiente
                </button>
                <button
                  onClick={() =>
                    updateReservationStatus(selectedReservationModal.id, 'cancelled')
                  }
                  className="bg-red-100 hover:bg-red-200 text-[#D92D20] text-xs font-bold py-2 rounded-xl"
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
              className="w-full bg-[#F58220] hover:bg-[#e07314] text-white text-xs font-bold py-3 rounded-2xl flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              <span>Enviar Confirmación por Correo</span>
            </button>
          </div>
        </div>
      )}

      {emailModalReservation &&
        (() => {
          const { subject, body } = buildConfirmationEmail(emailModalReservation);
          const mailtoLink = `mailto:${encodeURIComponent(
            emailModalReservation.client_email
          )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

          return (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-[#1F4FBE]">
                      Confirmación de Reservación
                    </h3>
                    <p className="text-xs text-[#5A6470]">
                      Para: <strong>{emailModalReservation.client_email}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setEmailModalReservation(null)}
                    className="p-1.5 rounded-xl hover:bg-[#F4F6F8]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-[#5A6470] block mb-1">Asunto:</span>
                    <div className="bg-[#F4F6F8] border border-slate-200 p-2.5 rounded-xl font-medium text-[#111111]">
                      {subject}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-[#5A6470] block mb-1">Mensaje:</span>
                    <textarea
                      readOnly
                      rows={11}
                      value={body}
                      className="w-full bg-[#F4F6F8] border border-slate-200 p-3 rounded-xl font-mono text-xs text-[#111111]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <a
                    href={mailtoLink}
                    onClick={() => markEmailAsSent(emailModalReservation.id)}
                    className="flex-1 bg-[#2E9E5B] hover:bg-[#25834b] text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
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
                    className="bg-[#F4F6F8] hover:bg-slate-200 text-[#111111] text-xs font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-4 h-4 text-[#2E9E5B]" />
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
                    className="bg-[#1F4FBE] hover:bg-[#173d96] text-white text-xs font-bold py-3 px-4 rounded-xl"
                  >
                    Marcar Enviado
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {contractViewReservation && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between print:hidden">
              <h3 className="font-bold text-[#1F4FBE]">
                Contrato Firmado — {contractViewReservation.folio}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#2E9E5B] text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Imprimir / PDF
                </button>
                <button
                  onClick={() => setContractViewReservation(null)}
                  className="p-1.5 rounded-xl hover:bg-[#F4F6F8]"
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
              emergencyContact: contractViewReservation.emergency_contact,
              clientEmail: contractViewReservation.client_email,
              seatNamesText: contractViewReservation.seat_names || contractViewReservation.companions,
              childrenText: contractViewReservation.children_info,
              promoUsed: contractViewReservation.promo_code_used,
              tourTitle: contractViewReservation.tour_title,
              tourDate: contractViewReservation.tour_date,
              seatsCountVal: contractViewReservation.passengers,
              total: contractViewReservation.total_amount,
              deposit: contractViewReservation.deposit_amount,
              signatureImg: contractViewReservation.signature_data,
              userAgentStr: contractViewReservation.user_agent
            })}
          </div>
        </div>
      )}

      {tourModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-[#1F4FBE]">
                {editingTour ? 'Editar Tour' : 'Publicar Nuevo Tour'}
              </h3>
              <button
                onClick={() => setTourModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#F4F6F8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTour} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#111111] block mb-1">
                  Nombre del Viaje *
                </label>
                <input
                  type="text"
                  required
                  value={tourForm.title}
                  onChange={(e) => setTourForm({ ...tourForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111111] block mb-1">Destino *</label>
                  <input
                    type="text"
                    required
                    value={tourForm.destination}
                    onChange={(e) => setTourForm({ ...tourForm, destination: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111111] block mb-1">
                    Fecha de Salida *
                  </label>
                  <input
                    type="text"
                    required
                    value={tourForm.date}
                    onChange={(e) => setTourForm({ ...tourForm, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-[#111111] block mb-1">
                    Precio Normal ($) *
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
                  <label className="font-semibold text-[#111111] block mb-1">
                    Precio Cliente ($) *
                  </label>
                  <input
                    type="number"
                    required
                    value={tourForm.client_price}
                    onChange={(e) =>
                      setTourForm({ ...tourForm, client_price: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#111111] block mb-1">
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
                  <label className="font-semibold text-[#111111] block mb-1">Cupo base</label>
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
                <label className="font-semibold text-[#111111] block mb-1">Duración</label>
                <input
                  type="text"
                  value={tourForm.duration}
                  onChange={(e) => setTourForm({ ...tourForm, duration: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111111] block mb-1">
                  ¿Qué incluye? (separado por comas)
                </label>
                <input
                  type="text"
                  value={tourForm.includesText}
                  onChange={(e) => setTourForm({ ...tourForm, includesText: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-[#111111] block mb-1">
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
                  className="accent-[#1F4FBE]"
                />
                <span className="font-semibold text-[#111111]">
                  Tour activo (visible para clientes)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setTourModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F4F6F8] text-[#111111] font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#F58220] text-white font-bold"
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
