"use client";
import {
  FileText,
  FileSearch,
  QrCode,
  FileCheck,
  ClipboardCheck,
  Shield,
  Brain,
  QrCodeIcon,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        ease: "easeOut",
        duration: 0.6,
      },
    },
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        ease: "easeOut",
        duration: 0.5,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        ease: "easeOut",
        duration: 0.5,
      },
    },
    hover: {
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      y: -5,
      transition: {
        ease: "easeOut",
        duration: 0.3,
      },
    },
  };

  const buttonVariants = {
    hover: {
      backgroundColor: "rgba(var(--primary-rgb), 0.2)",
      borderColor: "var(--primary)",
      color: "var(--primary)",
      transition: {
        duration: 0.3,
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div 
      className="min-h-screen py-12 sm:py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Hero section */}
      <motion.section 
        className="content-container mb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={containerVariants} className="flex flex-col gap-6">
          <motion.div variants={itemVariants} className="text-center sm:text-left">
            <motion.span 
              className="text-sm font-medium text-primary bg-primary/5 px-3 py-1 rounded-md border border-primary/50"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: 1,
                backgroundColor: ["rgba(var(--primary-rgb), 0.05)", "rgba(var(--primary-rgb), 0.1)", "rgba(var(--primary-rgb), 0.05)"],
              }}
              transition={{ 
                duration: 2, 
                ease: "easeInOut", 
              }}
            >
              Validasi Dokumen Terverifikasi
            </motion.span>
            <motion.h1 variants={itemVariants} className="mb-4 mt-3">
              <span className="">Notar</span>
              <motion.span 
                className="text-primary"
                animate={{ 
                  color: ["hsl(var(--primary))", "hsl(var(--primary) / 0.8)", "hsl(var(--primary))"]
                }}
                transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
              >
                .io
              </motion.span>
            </motion.h1>
            <motion.p variants={itemVariants} className="text-lg text-muted-foreground max-w-2xl">
              Sistem validasi dokumen akademik berbasis tanda tangan digital
              RSA/ECDSA dengan{" "}
              <motion.span 
                className="text-primary font-medium"
                animate={{ 
                  opacity: [1, 0.8, 1],
                }}
                transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
              >
                integrasi kecerdasan buatan
              </motion.span>{" "}
              untuk memastikan otentikasi dan verifikasi yang lebih andal.
            </motion.p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mt-2 sm:mt-6">
            <motion.div 
              whileHover={{
                backgroundColor: "rgba(var(--primary-rgb), 0.2)",
                color: "var(--primary)",
                borderColor: "var(--primary)",
                transition: { duration: 0.2 }
              }}
            >
              <Button 
                className="cursor-pointer border transition-all duration-300 ease-in-out hover:bg-primary/20 hover:text-primary hover:border hover:border-primary w-full" 
                onClick={() => router.push('/sign')}
              >
                Buat Tanda Tangan
              </Button>
            </motion.div>
            <motion.div
              whileHover={{
                backgroundColor: "rgba(var(--primary-rgb), 0.2)",
                color: "var(--primary)",
                transition: { duration: 0.2 }
              }}
            >
              <Button 
                variant="outline"
                className="cursor-pointer transition-all duration-300 ease-in-out hover:bg-primary/20 hover:text-primary w-full" 
                onClick={() => router.push('/verify')}
              >
                Verifikasi Dokumen
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features section */}
      <motion.section 
        className="content-container mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2 
          className="mb-6 text-center sm:text-left"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Fitur Utama
        </motion.h2>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.div 
            className="document-card"
            variants={cardVariants}
            whileHover="hover"
            initial="hidden" 
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              className="feature-icon"
              animate={{ 
                backgroundColor: ["hsl(var(--background))", "hsl(var(--primary) / 0.1)", "hsl(var(--background))"] 
              }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
            >
              <Shield className="w-5 h-5" />
            </motion.div>
            <h3 className="mb-2">Tanda Tangan Digital</h3>
            <p className="text-muted-foreground">
              Implementasi RSA/ECDSA dengan hash SHA-256 untuk menjamin keaslian
              dokumen akademik.
            </p>
          </motion.div>

          {/* AI Integration Card */}
          <motion.div 
            className="document-card border-primary/20"
            variants={cardVariants}
            whileHover="hover"
            initial="hidden" 
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              className="feature-icon"
              animate={{ 
                backgroundColor: ["hsl(var(--background))", "hsl(var(--primary) / 0.1)", "hsl(var(--background))"] 
              }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}
            >
              <Brain className="w-5 h-5" />
            </motion.div>
            <h3 className="mb-2">Integrasi AI</h3>
            <p className="text-muted-foreground">
              Kecerdasan buatan untuk mendeteksi manipulasi dokumen,
              inkonsistensi data, dan pola pemalsuan.
            </p>
          </motion.div>

          <motion.div 
            className="document-card"
            variants={cardVariants}
            whileHover="hover"
            initial="hidden" 
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              className="feature-icon"
              animate={{ 
                backgroundColor: ["hsl(var(--background))", "hsl(var(--primary) / 0.1)", "hsl(var(--background))"] 
              }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, delay: 1 }}
            >
              <QrCodeIcon className="w-5 h-5" />
            </motion.div>
            <h3 className="mb-2">Verifikasi QR Code</h3>
            <p className="text-muted-foreground">
              Dokumen ditandai dengan QR code unik untuk validasi cepat dan
              mudah.
            </p>
          </motion.div>

          <motion.div 
            className="document-card"
            variants={cardVariants}
            whileHover="hover"
            initial="hidden" 
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              className="feature-icon"
              animate={{ 
                backgroundColor: ["hsl(var(--background))", "hsl(var(--primary) / 0.1)", "hsl(var(--background))"] 
              }}
              transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, delay: 1.5 }}
            >
              <Search className="w-5 h-5" />
            </motion.div>
            <h3 className="mb-2">Public Document Lookup</h3>
            <p className="text-muted-foreground">
              Fitur pencarian dengan ID dokumen untuk verifikasi oleh pihak
              eksternal.
            </p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* AI Features section */}
      <motion.section 
        className="content-container mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2 
          className="mb-6 text-center sm:text-left"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Fitur Kecerdasan Buatan
        </motion.h2>

        <motion.div 
          className="document-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              className="p-4 bg-secondary rounded-md"
              variants={cardVariants}
              whileHover={{
                backgroundColor: "hsl(var(--primary) / 0.05)",
                transition: { duration: 0.3 }
              }}
            >
              <div className="flex items-center mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <FileText className="mr-2 text-xl text-primary" />
                </motion.div>
                <h4 className="text-base font-medium">Klasifikasi Dokumen</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                AI secara otomatis mengenali jenis dokumen yang diunggah untuk
                memastikan pemrosesan yang tepat.
              </p>
            </motion.div>

            <motion.div 
              className="p-4 bg-secondary rounded-md"
              variants={cardVariants}
              whileHover={{
                backgroundColor: "hsl(var(--primary) / 0.05)",
                transition: { duration: 0.3 }
              }}
            >
              <div className="flex items-center mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <FileSearch className="mr-2 text-xl text-primary" />
                </motion.div>
                <h4 className="text-base font-medium">Metadata Otomatis</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Mengekstrak metadata penting seperti nama, tanggal, dan
                institusi dari dokumen secara otomatis.
              </p>
            </motion.div>

            <motion.div 
              className="p-4 bg-secondary rounded-md"
              variants={cardVariants}
              whileHover={{
                backgroundColor: "hsl(var(--primary) / 0.05)",
                transition: { duration: 0.3 }
              }}
            >
              <div className="flex items-center mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 5, delay: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <QrCode className="mr-2 text-xl text-primary" />
                </motion.div>
                <h4 className="text-base font-medium">QR Code Posisi</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Memberikan saran posisi optimal untuk penempatan QR code pada
                layout dokumen.
              </p>
            </motion.div>

            <motion.div 
              className="p-4 bg-secondary rounded-md"
              variants={cardVariants}
              whileHover={{
                backgroundColor: "hsl(var(--primary) / 0.05)",
                transition: { duration: 0.3 }
              }}
            >
              <div className="flex items-center mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 5, delay: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <FileCheck className="mr-2 text-xl text-primary" />
                </motion.div>
                <h4 className="text-base font-medium">Lookup Summary</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Menghasilkan ringkasan dokumen yang informatif untuk ditampilkan
                pada halaman verifikasi publik.
              </p>
            </motion.div>

            <motion.div 
              className="p-4 bg-secondary rounded-md sm:col-span-2"
              variants={cardVariants}
              whileHover={{
                backgroundColor: "hsl(var(--primary) / 0.05)",
                transition: { duration: 0.3 }
              }}
            >
              <div className="flex items-center mb-3">
                <motion.div
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 5, delay: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ClipboardCheck className="mr-2 text-xl text-primary" />
                </motion.div>
                <h4 className="text-base font-medium">Validasi Isi</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Melakukan pemeriksaan kesesuaian isi dokumen untuk mendeteksi
                anomali dan memastikan integritas.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* How it works section with updated AI description */}
      <motion.section 
        className="content-container mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2 
          className="mb-6 text-center sm:text-left"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Proses Kerja
        </motion.h2>

        <motion.div 
          className="document-card"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <motion.ol 
            className="space-y-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.li 
              className="flex gap-4 pb-4 border-b border-border"
              variants={listItemVariants}
            >
              <motion.span 
                className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-medium"
                whileHover={{ 
                  backgroundColor: "hsl(var(--primary) / 0.8)",
                  transition: { duration: 0.3 }
                }}
              >
                1
              </motion.span>
              <div>
                <p className="font-medium">Pembuatan Dokumen</p>
                <p className="text-muted-foreground mt-1">
                  Pengguna membuat dokumen dari template atau mengunggah dokumen
                  yang sudah ada untuk diproses.
                </p>
              </div>
            </motion.li>

            <motion.li 
              className="flex gap-4 pb-4 border-b border-border"
              variants={listItemVariants}
            >
              <motion.span 
                className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-medium"
                whileHover={{ 
                  backgroundColor: "hsl(var(--primary) / 0.8)",
                  transition: { duration: 0.3 }
                }}
              >
                2
              </motion.span>
              <div>
                <p className="font-medium">Analisis AI</p>
                <p className="text-muted-foreground mt-1">
                  Kecerdasan buatan menganalisis dokumen untuk mendeteksi
                  manipulasi, inkonsistensi data, dan pola pemalsuan.
                </p>
              </div>
            </motion.li>

            <motion.li 
              className="flex gap-4 pb-4 border-b border-border"
              variants={listItemVariants}
            >
              <motion.span 
                className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-medium"
                whileHover={{ 
                  backgroundColor: "hsl(var(--primary) / 0.8)",
                  transition: { duration: 0.3 }
                }}
              >
                3
              </motion.span>
              <div>
                <p className="font-medium">Penandatanganan Digital</p>
                <p className="text-muted-foreground mt-1">
                  Dokumen ditandatangani menggunakan algoritma RSA/ECDSA dengan
                  hash SHA-256 dan timestamp terintegrasi.
                </p>
              </div>
            </motion.li>

            <motion.li 
              className="flex gap-4"
              variants={listItemVariants}
            >
              <motion.span 
                className="flex-shrink-0 w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-medium"
                whileHover={{ 
                  backgroundColor: "hsl(var(--primary) / 0.8)",
                  transition: { duration: 0.3 }
                }}
              >
                4
              </motion.span>
              <div>
                <p className="font-medium">Verifikasi Terbuka</p>
                <p className="text-muted-foreground mt-1">
                  Pihak ketiga dapat memvalidasi dokumen melalui QR code atau
                  pencarian ID dokumen dengan dukungan ringkasan AI.
                </p>
              </div>
            </motion.li>
          </motion.ol>
        </motion.div>
      </motion.section>

      {/* Technical example */}
      <motion.section 
        className="content-container mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2 
          className="mb-6 text-center sm:text-left"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Contoh Verifikasi
        </motion.h2>

        <motion.div 
          className="document-card"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          whileHover={{
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            transition: { duration: 0.3 }
          }}
        >
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl">Detail Dokumen</h3>
                <motion.span 
                  className="status-pill status-verified"
                  animate={{ 
                    backgroundColor: ["hsl(var(--primary) / 0.15)", "hsl(var(--primary) / 0.25)", "hsl(var(--primary) / 0.15)"]
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Terverifikasi
                </motion.span>
              </div>

              <motion.div 
                className="hash-code mb-4"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="data-grid">
                  <dt>Jenis</dt>
                  <dd>SK Penelitian</dd>

                  <dt>Nama File</dt>
                  <dd>SK_Penelitian_2023.pdf</dd>

                  <dt>Tanggal</dt>
                  <dd>2025-05-18</dd>
                </div>

                <motion.div 
                  className="mt-3 pt-3 border-t border-border"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  viewport={{ once: true }}
                >
                  <span className="text-sm text-muted-foreground">
                    Hash SHA-256:
                  </span>
                  <motion.p 
                    className="font-mono text-xs break-all mt-1"
                    animate={{ 
                      color: ["hsl(var(--foreground))", "hsl(var(--primary))", "hsl(var(--foreground))"] 
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                  >
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </motion.p>
                </motion.div>
              </motion.div>

              <div>
                <motion.h4 
                  className="text-base font-medium mb-2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  viewport={{ once: true }}
                >
                  Ringkasan AI
                </motion.h4>
                <motion.div 
                  className="p-3 rounded-md bg-accent/10 mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                  whileHover={{
                    backgroundColor: "hsl(var(--primary) / 0.05)",
                    transition: { duration: 0.3 }
                  }}
                >
                  <p className="text-sm text-muted-foreground">
                    Surat Keputusan Penelitian untuk Dr. Budi Santoso terkait
                    proyek "Implementasi Blockchain untuk Keamanan Data
                    Akademik" yang dikeluarkan oleh Lembaga Penelitian
                    Universitas Indonesia.
                  </p>
                </motion.div>

                <motion.h4 
                  className="text-base font-medium mb-2"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  viewport={{ once: true }}
                >
                  Penandatangan
                </motion.h4>
                <motion.div 
                  className="data-grid"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  <dt>Nama</dt>
                  <dd>Dr. Budi Santoso</dd>

                  <dt>Jabatan</dt>
                  <dd>Ketua Lembaga Penelitian</dd>

                  <dt>ID Sertifikat</dt>
                  <dd>UI-LP-2025-0542</dd>
                </motion.div>
              </div>
            </div>

            <motion.div 
              className="qr-preview w-32 h-32 flex-shrink-0 mx-auto md:mx-0 bg-secondary"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              animate={{ 
                border: ["1px solid transparent", "1px solid hsl(var(--primary) / 0.3)", "1px solid transparent"],
                boxShadow: [
                  "0 0 0 0 rgba(var(--primary-rgb), 0)",
                  "0 0 0 4px rgba(var(--primary-rgb), 0.1)",
                  "0 0 0 0 rgba(var(--primary-rgb), 0)"
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {/* Placeholder for QR code image */}
              <div className="w-full h-full flex items-center justify-center text-xs text-center p-2">
                QR Code Verifikasi
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* Benefits section */}
      <motion.section 
        className="content-container"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2 
          className="mb-6 text-center sm:text-left"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          Manfaat Implementasi
        </motion.h2>

        <motion.div 
          className="document-card"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <motion.ul 
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.li 
              className="flex gap-3"
              variants={listItemVariants}
              whileHover={{ x: 5, transition: { duration: 0.2 } }}
            >
              <motion.div 
                className="text-primary font-medium"
                animate={{ 
                  opacity: [1, 0.6, 1] 
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0 }}
              >
                •
              </motion.div>
              <div>
                <p className="font-medium">Jaminan Integritas Dokumen</p>
                <p className="text-muted-foreground mt-1">
                  Mencegah pemalsuan dan memberikan jaminan keaslian dokumen
                  akademik melalui kombinasi tanda tangan digital dan AI.
                </p>
              </div>
            </motion.li>
            <motion.li 
              className="flex gap-3"
              variants={listItemVariants}
              whileHover={{ x: 5, transition: { duration: 0.2 } }}
            >
              <motion.div 
                className="text-primary font-medium"
                animate={{ 
                  opacity: [1, 0.6, 1] 
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                •
              </motion.div>
              <div>
                <p className="font-medium">Transformasi Digital Kampus</p>
                <p className="text-muted-foreground mt-1">
                  Menjadi bagian dari solusi transformasi digital pada sistem
                  administrasi kampus dengan otomatisasi berbasis AI.
                </p>
              </div>
            </motion.li>
            <motion.li 
              className="flex gap-3"
              variants={listItemVariants}
              whileHover={{ x: 5, transition: { duration: 0.2 } }}
            >
              <motion.div 
                className="text-primary font-medium"
                animate={{ 
                  opacity: [1, 0.6, 1] 
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                •
              </motion.div>
              <div>
                <p className="font-medium">Efisiensi Proses</p>
                <p className="text-muted-foreground mt-1">
                  Mengurangi waktu pemrosesan dokumen dengan ekstraksi metadata
                  otomatis dan klasifikasi dokumen cerdas.
                </p>
              </div>
            </motion.li>
            <motion.li 
              className="flex gap-3"
              variants={listItemVariants}
              whileHover={{ x: 5, transition: { duration: 0.2 } }}
            >
              <motion.div 
                className="text-primary font-medium"
                animate={{ 
                  opacity: [1, 0.6, 1] 
                }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
              >
                •
              </motion.div>
              <div>
                <p className="font-medium">Potensi Pengembangan</p>
                <p className="text-muted-foreground mt-1">
                  Dapat dikembangkan lebih lanjut dengan peningkatan kemampuan
                  AI dan integrasi blockchain untuk keamanan maksimal.
                </p>
              </div>
            </motion.li>
          </motion.ul>
        </motion.div>
      </motion.section>
      
    </motion.div>
  );
}